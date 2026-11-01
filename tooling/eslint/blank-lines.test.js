import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import rule from './blank-lines.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } });
const error = { messageId: 'missing' };
const imports = "import type { A } from 'a';\nimport 'side-effect';";
const vitest =
  "import { test, describe, beforeEach, it as check } from 'vitest';\n\n";
const playwright = "import { test } from '@playwright/test';\n\n";

tester.run('blank-lines', rule, {
  valid: [
    `${imports}\n\nconst value = 1;\nconst next = 2;`,
    'type A = string;\n\ntype B = number;',
    'function a() {}\n\nconst b = () => {\n  return 1;\n};',
    `${vitest}test('a', () => {});\n\ntest.each([1])('b', () => {});`,
    `${playwright}test.describe('suite', () => {\n  test.beforeEach(async () => {});\n\n  test('a', async () => {\n    test.fail(true);\n    const a = 1;\n    const b = 2;\n  });\n});`,
    `${vitest}test('outer', () => {\n  const test = () => {};\n  test('a', () => {});\n  test('b', () => {});\n});`,
    `${playwright}test.step('a', () => {});\ntest.step('b', () => {});`,
    `${playwright}test('outer', () => {\n  test.skip(true, 'reason');\n  test.fail(false);\n});`,
    "const test = () => {};\ntest('a', () => {});\ntest('b', () => {});",
    `${vitest}test('a', () => {});\n// First part\n\n// Second part\ntest('b', () => {});`,
  ],
  invalid: [
    {
      code: `${imports}\nconst value = 1;`,
      output: `${imports}\n\nconst value = 1;`,
      errors: [error],
    },
    {
      code: 'type A = string;\ntype B = number;',
      output: 'type A = string;\n\ntype B = number;',
      errors: [error],
    },
    {
      code: 'export type A = string;\nexport function b() {}',
      output: 'export type A = string;\n\nexport function b() {}',
      errors: [error],
    },
    {
      code: 'const A = () => {\n  return null;\n};\nconst B = () => {\n  return null;\n};',
      output:
        'const A = () => {\n  return null;\n};\n\nconst B = () => {\n  return null;\n};',
      errors: [error],
    },
    ...[
      "test('a', () => {});\ntest('b', () => {});",
      "beforeEach(() => {});\ntest('a', () => {});",
      "test('a', handler);\ntest('b', handler);",
      "test.todo('a');\ntest.todo('b');",
      "beforeEach(setup);\ntest('a', handler);",
      "test.skip('a', () => {});\ncheck.each([1])('b', () => {});",
      "describe.each([1])('a', () => {});\ndescribe('b', () => {});",
      "test('a', () => {});\n// Attached to b\ntest('b', () => {});",
      "test('a', () => {}); test('b', () => {});",
      "test.each`value\n${1}`('a', () => {});\ntest('b', () => {});",
    ].map((body) => ({
      code: vitest + body,
      output:
        vitest + body.replace(';\n', ';\n\n').replace('; test', ';\n\n test'),
      errors: [error],
    })),
    ...[
      "test.describe('a', () => {});\ntest.describe('b', () => {});",
      "test.beforeEach(async () => {});\ntest('a', async () => {});",
      'test.beforeEach(setup);\ntest.afterEach(teardown);',
      "test('a', async () => {});\ntest.afterAll(async () => {});",
    ].map((body) => ({
      code: playwright + body,
      output: playwright + body.replace(';\n', ';\n\n'),
      errors: [error],
    })),
  ],
});
