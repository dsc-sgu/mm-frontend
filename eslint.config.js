import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const TRANSPORT_MODULE = 'src/app/remote-data/http.ts';

const parentRelativeImports = {
  group: ['../**'],
  message: 'Use @/... imports instead of parent-relative imports.',
};

const mockApiImports = {
  // Patterns match the import string, and TypeScript allows `.ts` in it.
  group: [
    '**/api/mock',
    '**/api/mock.*',
    './mock',
    './mock.*',
    '@/app/mock-backend',
    '@/app/mock-backend/*',
  ],
  message:
    'Production code must not import mock API: MSW serves mocks at the same URLs as the backend.',
};

const mswImports = {
  group: ['msw', 'msw/*'],
  message: 'Only mock API and tests may use MSW.',
};

const axiosPath = {
  name: 'axios',
  message: `Use runHttpOperation from ${TRANSPORT_MODULE}.`,
};

// A pattern, unlike a path with importNames, ignores `import * as React`.
const syncExternalStorePattern = {
  group: ['react'],
  importNamePattern: '^useSyncExternalStore$',
  message:
    "State outside React → zustand/vanilla store in the feature's model/ (AGENTS.md: State modeling). useSyncExternalStore is only for browser API adapters.",
};

function restrictedImportsWithPaths(paths, patterns) {
  return ['error', { paths, patterns: [parentRelativeImports, ...patterns] }];
}

function restrictedImports(...patterns) {
  return restrictedImportsWithPaths(
    [axiosPath],
    [syncExternalStorePattern, ...patterns]
  );
}

// Browser API adapters, the only legitimate users of useSyncExternalStore.
// Generated shadcn components use `import * as React`, which the rule flags.
const BROWSER_API_ADAPTERS = [
  'src/shadcn/components/ui/**',
  'src/hooks/use-media-query.ts',
  // The theme class on <html> is set by an inline script before the bundle
  // loads, so the DOM stays the source of truth and React observes it.
  'src/features/course/features/attempt-review/hooks/use-html-theme.ts',
];

const fetchMessage = `Call Fetch only through runHttpOperation from ${TRANSPORT_MODULE}.`;

// Production code that still imports in-memory mocks. Each slice that moves a
// feature to Fetch and MSW removes its files; the final slice removes the list.
const RAM_MOCK_IMPORTERS = [
  'src/features/course/features/attempt-review/api/queries.ts',
  'src/features/course/features/attempts/api/queries.ts',
  'src/features/course/features/attempts/hooks/use-lock-updates.ts',
  'src/features/course/features/page/api/queries.ts',
  'src/features/course/features/task/api/queries.ts',
  'src/features/deadlines-calendar/api/queries.ts',
];

const MOCK_AND_TEST_FILES = [
  'src/app/mock-backend/**',
  'src/**/api/mock.ts',
  'src/app/testing/**',
  'src/**/*.test.{ts,tsx}',
];

const VALIBOT_RUNTIME_FILES = [
  'src/features/**/api/**',
  'src/features/**/model/**',
  'src/features/**/routing/**',
  TRANSPORT_MODULE,
  ...MOCK_AND_TEST_FILES,
  'playwright/**',
];

// Orthogonal to the mock-import exceptions: a RAM hook still cannot own schemas.
// `verbatimModuleSyntax` retains empty imports/exports, including per-specifier
// `type` forms. Only whole `import type`/`export type` declarations are erased.
const valibotRuntimeSelectors = [
  "ImportDeclaration[source.value='valibot'][importKind!='type']",
  "ExportNamedDeclaration[source.value='valibot'][exportKind!='type']",
  "ExportAllDeclaration[source.value='valibot'][exportKind!='type']",
  "ImportExpression[source.value='valibot']",
  "CallExpression[callee.name='require'][arguments.0.value='valibot']",
];

export default defineConfig([
  globalIgnores([
    'dist',
    'test-results',
    'playwright-report',
    '**/routeTree.gen.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': restrictedImports(mockApiImports, mswImports),
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: fetchMessage },
      ],
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis', 'self'].map((object) => ({
          object,
          property: 'fetch',
          message: fetchMessage,
        })),
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'no-nested-ternary': 'error',
    },
  },
  {
    files: RAM_MOCK_IMPORTERS,
    rules: {
      'no-restricted-imports': restrictedImports(mswImports),
    },
  },
  {
    files: BROWSER_API_ADAPTERS,
    rules: {
      'no-restricted-imports': restrictedImportsWithPaths(
        [axiosPath],
        [mockApiImports, mswImports]
      ),
    },
  },
  {
    files: MOCK_AND_TEST_FILES,
    rules: {
      'no-restricted-imports': restrictedImports(),
      // Never hot-reloaded.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: [TRANSPORT_MODULE],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: VALIBOT_RUNTIME_FILES,
    rules: {
      'no-restricted-syntax': [
        'error',
        ...valibotRuntimeSelectors.map((selector) => ({
          selector,
          message:
            'Runtime Valibot belongs in feature api/model/routing. Consume an owned validation interface here; use whole-declaration import type/export type for erased type dependencies.',
        })),
      ],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  prettierRecommended,
]);
