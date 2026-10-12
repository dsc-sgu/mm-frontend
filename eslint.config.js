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

function restrictedImports(...patterns) {
  return [
    'error',
    {
      paths: [
        {
          name: 'axios',
          message: `Use runHttpOperation from ${TRANSPORT_MODULE}.`,
        },
      ],
      patterns: [parentRelativeImports, ...patterns],
    },
  ];
}

const fetchMessage = `Call Fetch only through runHttpOperation from ${TRANSPORT_MODULE}.`;

// Production code that still imports in-memory mocks. Each slice that moves a
// feature to Fetch and MSW removes its files; the final slice removes the list.
const RAM_MOCK_IMPORTERS = [
  'src/features/course/api/queries.ts',
  'src/features/course/features/access/api/queries.ts',
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

export default defineConfig([
  globalIgnores(['dist', '**/routeTree.gen.ts']),
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
    },
  },
  {
    files: RAM_MOCK_IMPORTERS,
    rules: {
      'no-restricted-imports': restrictedImports(mswImports),
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
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  prettierRecommended,
]);
