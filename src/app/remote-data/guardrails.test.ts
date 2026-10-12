import { ESLint } from 'eslint';
import { describe, expect, test } from 'vitest';

// TR-06: the project ESLint config keeps a single Fetch path.

const GUARDRAIL_RULES = new Set([
  'no-restricted-imports',
  'no-restricted-globals',
  'no-restricted-properties',
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

  test('listed RAM-mock importers may import mocks but not MSW', async () => {
    const file = 'src/features/course/api/queries.ts';

    expect(
      await violations("import { x } from '@/features/course/api/mock';", file)
    ).toEqual([]);
    expect(await violations("import { http } from 'msw';", file)).toEqual([
      'no-restricted-imports',
    ]);
  });
});
