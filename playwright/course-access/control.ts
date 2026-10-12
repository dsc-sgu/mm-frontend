import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as v from 'valibot';

const CONTROL_URL = '/__test/mock-backend';
const OperationSchema = v.literal('load-course-by-slug');
const CommandSchema = v.variant('action', [
  v.object({
    action: v.literal('scenario'),
    world: v.picklist(['dev', 'world:access']),
    session: v.nullable(v.string()),
  }),
  v.object({ action: v.literal('hold'), operation: OperationSchema }),
  v.object({ action: v.literal('release'), operation: OperationSchema }),
]);
const StatusSchema = v.object({
  world: v.picklist(['dev', 'world:access']),
  held: v.array(
    v.object({ operation: OperationSchema, requested: v.number() })
  ),
});

type Command = v.InferOutput<typeof CommandSchema>;

export async function controlMockBackend(page: Page, command: Command) {
  const status = await page.evaluate(
    async ({ url, body }) => {
      // This test-only HTTP channel must run in the MSW-controlled page.
      // eslint-disable-next-line no-restricted-globals
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.status;
    },
    { url: CONTROL_URL, body: v.parse(CommandSchema, command) }
  );
  expect(status, 'the test-only MSW control command succeeds').toBe(204);
}

export async function selectAccessSession(page: Page, username: string | null) {
  await page.goto('/');
  // Rendering starts only after MSW is listening. No login markup is a seam.
  await expect(page.getByRole('link', { name: 'На главную' })).toBeVisible();
  await controlMockBackend(page, {
    action: 'scenario',
    world: 'world:access',
    session: username,
  });
  // The scenario's world/session survive this full reload, unlike ordinary dev.
  await page.reload();
}

export async function waitForHeldCourseLookup(page: Page) {
  await expect
    .poll(async () => {
      const body: unknown = await page.evaluate(async (url) => {
        // eslint-disable-next-line no-restricted-globals
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`Test control HTTP ${response.status}`);
        const payload: unknown = await response.json();
        return payload;
      }, CONTROL_URL);
      const status = v.parse(StatusSchema, body);
      return (
        status.held.find((gate) => gate.operation === 'load-course-by-slug')
          ?.requested ?? 0
      );
    })
    .toBeGreaterThan(0);
}
