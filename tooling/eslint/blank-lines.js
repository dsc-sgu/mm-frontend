// Mechanical boundaries only. Logical phases and independent scenarios need review.
const TEST_MODULES = new Set([
  'vitest',
  '@playwright/test',
  '@fast-check/vitest',
]);
const TEST_NAMES = new Set([
  'it',
  'test',
  'describe',
  'beforeAll',
  'afterAll',
  'beforeEach',
  'afterEach',
]);
const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
]);

function declaration(statement) {
  return statement.declaration ?? statement;
}

function isDeclarationBoundary(statement) {
  const node = declaration(statement);
  if (
    [
      'FunctionDeclaration',
      'TSTypeAliasDeclaration',
      'TSInterfaceDeclaration',
    ].includes(node.type)
  ) {
    return true;
  }
  return (
    node.type === 'VariableDeclaration' &&
    node.kind === 'const' &&
    node.loc.start.line !== node.loc.end.line &&
    node.declarations.some(({ init }) => init && FUNCTION_TYPES.has(init.type))
  );
}

// Unwrap modifiers and parameterization: test.skip.each(cases)(...), test.prop(...)(...).
function callRoot(node) {
  if (node.type === 'Identifier') {
    return node;
  }
  if (node.type === 'MemberExpression') {
    return callRoot(node.object);
  }
  if (node.type === 'CallExpression') {
    return callRoot(node.callee);
  }
  if (node.type === 'TaggedTemplateExpression') {
    return callRoot(node.tag);
  }
  return null;
}

export default {
  meta: {
    type: 'layout',
    docs: {
      description:
        'Separate imports, declarations, tests and test hooks with blank lines.',
    },
    fixable: 'whitespace',
    schema: [],
    messages: { missing: 'Separate these constructs with a blank line.' },
  },
  create(context) {
    const source = context.sourceCode;
    const bindings = new Map();

    function isTestBoundary(statement) {
      if (
        statement.type !== 'ExpressionStatement' ||
        statement.expression.type !== 'CallExpression'
      )
        return false;
      const call = statement.expression;
      const root = callRoot(call.callee);
      if (!root || !bindings.has(root.name)) return false;
      let scope = source.getScope(root);
      while (scope && !scope.set.has(root.name)) scope = scope.upper;
      const variable = scope?.set.get(root.name);
      if (!variable?.defs.some((def) => def.node === bindings.get(root.name)))
        return false;
      const member =
        call.callee.type === 'MemberExpression' && !call.callee.computed
          ? call.callee.property.name
          : null;
      if (
        ['step', 'use', 'extend', 'info', 'setTimeout', 'configure'].includes(
          member
        )
      )
        return false;
      // Inline callbacks cover dynamic titles and property-based generators.
      if (call.arguments.some((arg) => FUNCTION_TYPES.has(arg.type)))
        return true;
      const imported = bindings.get(root.name).imported.name;
      // Hooks may refer to a separately declared callback.
      if (
        ['beforeAll', 'afterAll', 'beforeEach', 'afterEach'].includes(
          member ?? imported
        )
      ) {
        return call.arguments.length > 0;
      }
      // Titles also identify declarations with callback references or no callback
      // (Vitest test.todo). Runtime annotations use a condition instead of a title.
      const title = call.arguments[0];
      return (
        title?.type === 'TemplateLiteral' ||
        (title?.type === 'Literal' && typeof title.value === 'string')
      );
    }

    function check(statements) {
      for (let i = 1; i < statements.length; i++) {
        const previous = statements[i - 1];
        const current = statements[i];
        const afterImports =
          previous.type === 'ImportDeclaration' &&
          current.type !== 'ImportDeclaration';
        const declarations =
          isDeclarationBoundary(previous) || isDeclarationBoundary(current);
        const tests = isTestBoundary(previous) && isTestBoundary(current);
        if (!(afterImports || declarations || tests)) continue;
        // Keep adjacent imports compact, even before a type declaration.
        if (
          previous.type === 'ImportDeclaration' &&
          current.type === 'ImportDeclaration'
        )
          continue;
        const gap = source.text.slice(previous.range[1], current.range[0]);
        if (/\n[^\S\r\n]*\r?\n/u.test(gap)) continue;
        context.report({
          node: current,
          messageId: 'missing',
          fix(fixer) {
            // Insert before the next statement's leading comments, retaining their attachment.
            const lineEnd = source.text.indexOf('\n', previous.range[1]);
            if (lineEnd !== -1 && lineEnd < current.range[0]) {
              return fixer.insertTextAfterRange([lineEnd, lineEnd], '\n');
            }
            return fixer.insertTextAfter(previous, '\n\n');
          },
        });
      }
    }

    return {
      Program(node) {
        for (const statement of node.body) {
          if (
            statement.type !== 'ImportDeclaration' ||
            !TEST_MODULES.has(statement.source.value)
          )
            continue;
          for (const specifier of statement.specifiers) {
            if (
              specifier.type === 'ImportSpecifier' &&
              TEST_NAMES.has(specifier.imported.name)
            )
              bindings.set(specifier.local.name, specifier);
          }
        }
        check(node.body);
      },
      BlockStatement: (node) => check(node.body),
      TSModuleBlock: (node) => check(node.body),
      SwitchCase: (node) => check(node.consequent),
    };
  },
};
