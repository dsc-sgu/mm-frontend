import { ESLint } from 'eslint';
import { describe, expect, test } from 'vitest';

// TR-06: the project ESLint config keeps a single Fetch path.

const GUARDRAIL_RULES = new Set([
  'no-restricted-imports',
  'no-restricted-globals',
  'no-restricted-properties',
  'no-restricted-syntax',
]);

const eslint = new ESLint();

async function violations(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages
    .filter(({ ruleId }) => ruleId && GUARDRAIL_RULES.has(ruleId))
    .map(({ ruleId }) => ruleId);
}

const FEATURE_FILE = 'src/features/example/api/load.ts';

describe('TR-06: remote-data guardrails', () => {
  test('Axios is forbidden everywhere', async () => {
    const code = "import axios from 'axios';\nvoid axios;\n";

    expect(await violations(code, FEATURE_FILE)).toEqual([
      'no-restricted-imports',
    ]);
    expect(await violations(code, 'src/app/remote-data/http.ts')).toEqual([
      'no-restricted-imports',
    ]);
  });

  test.each([
    ["void fetch('/api');\n", 'no-restricted-globals'],
    ["void window.fetch('/api');\n", 'no-restricted-properties'],
    ["void globalThis.fetch('/api');\n", 'no-restricted-properties'],
  ])('%s is forbidden outside the transport module', async (code, rule) => {
    expect(await violations(code, FEATURE_FILE)).toEqual([rule]);
    expect(await violations(code, 'src/app/remote-data/http.ts')).toEqual([]);
  });

  test.each([
    "import { authHandlers } from '@/features/auth/api/mock';",
    "import { authHandlers } from '@/features/auth/api/mock.ts';",
    "import { load } from './mock';",
    "import { load } from './mock.ts';",
    "import { server } from '@/app/mock-backend/node';",
    "import { server } from '@/app/mock-backend/node.ts';",
    "import { http } from 'msw';",
  ])('production code cannot `%s`', async (code) => {
    expect(await violations(code, FEATURE_FILE)).toEqual([
      'no-restricted-imports',
    ]);
  });

  test('mock API and tests may import mocks', async () => {
    const code =
      "import { mockBackend } from '@/app/mock-backend/state';\n" +
      "import { http } from 'msw';\n";

    expect(await violations(code, 'src/features/example/api/mock.ts')).toEqual(
      []
    );
    expect(await violations(code, 'src/features/example/load.test.ts')).toEqual(
      []
    );
  });

  test.each([
    "import { courseHandlers } from '@/features/course/api/mock';",
    "import { http } from 'msw';",
  ])('course list queries cannot `%s`', async (code) => {
    expect(
      await violations(code, 'src/features/course/api/queries.ts')
    ).toEqual(['no-restricted-imports']);
  });
});

describe('schema placement guardrails', () => {
  test.each([
    'src/features/example/ui/form.tsx',
    'src/features/course/features/attempts/hooks/use-lock-updates.ts',
    'src/routes/_authenticated/example.tsx',
    'src/app/header/ui/example.tsx',
    'src/features/example/validation.ts',
    'src/schemas/user.ts',
  ])('%s cannot depend on runtime Valibot', async (file) => {
    expect(
      await violations("import * as v from 'valibot';\nvoid v;\n", file)
    ).toEqual(['no-restricted-syntax']);
  });

  test.each([
    'src/features/auth/api/check-session.ts',
    'src/features/auth/model/identity.ts',
    'src/features/course/routing/params.ts',
    'src/features/course/features/page-edit/model/validation.ts',
    'src/features/course/features/page/api/queries.ts',
    'src/app/remote-data/http.ts',
    'src/app/mock-backend/state.ts',
    'src/app/testing/reply.ts',
    'src/features/example/schema.test.ts',
    'playwright/example/fixtures.ts',
  ])('%s may use runtime Valibot', async (file) => {
    expect(
      await violations("import * as v from 'valibot';\nvoid v;\n", file)
    ).toEqual([]);
  });

  test.each([
    "import { string } from 'valibot';",
    "import { type InferOutput } from 'valibot';",
    "import { type InferOutput, string } from 'valibot';",
    "import 'valibot';",
    "import {} from 'valibot';",
    "export { string } from 'valibot';",
    "export { type InferOutput } from 'valibot';",
    "export { type InferOutput, string } from 'valibot';",
    "export * from 'valibot';",
    "export {} from 'valibot';",
    "void import('valibot');",
    "void require('valibot');",
  ])('UI cannot bypass the boundary with `%s`', async (code) => {
    expect(await violations(code, 'src/features/example/ui/form.tsx')).toEqual([
      'no-restricted-syntax',
    ]);
  });

  test.each([
    "import type { InferOutput } from 'valibot';",
    "import type {} from 'valibot';",
    "export type { InferOutput } from 'valibot';",
    "export type * from 'valibot';",
    "export type {} from 'valibot';",
  ])('UI may use type-only `%s`', async (code) => {
    expect(await violations(code, 'src/features/example/ui/form.tsx')).toEqual(
      []
    );
  });

  test('UI may pass a model-owned schema to its form resolver', async () => {
    expect(
      await violations(
        "import { registrationSchema } from '@/features/auth/model/schema';",
        'src/features/example/ui/form.tsx'
      )
    ).toEqual([]);
  });
});
