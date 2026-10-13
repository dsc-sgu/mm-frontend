import { expect, test } from '@playwright/test';
import { selectAccessSession } from './control';

for (const resource of [
  'tasks/1/attempts/petya/1',
  'tasks/1/attempts/petya/1/review',
  'repositories/petya/commits',
]) {
  test(`ACC-E1: Sasha opens ${resource} and gets a non-leaking resource 404`, async ({
    page,
  }) => {
    await selectAccessSession(page, 'sasha', 'world:review');
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/courses/') &&
        (response.url().includes('/attempts/petya/1') ||
          response.url().includes('/repositories/petya'))
    );
    const path = `/courses/algorithms/${resource}`;
    await page.goto(path);
    const response = await responsePromise;
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ status: 'forbidden' });
    expect(response.headers()['content-type']).toBe('application/json');
    expect(
      Object.keys(response.headers()).every((name) =>
        ['content-type', 'content-length'].includes(name)
      )
    ).toBe(true);
    await expect(
      page.getByRole('heading', { name: 'Страница не найдена' })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Разделы страницы' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'На страницу курса' })
    ).toBeVisible();
    await expect(page).toHaveURL(path);
    await expect(page.locator('body')).not.toContainText(
      /Петя|petya|src\/main\.ts|README\.md/
    );
    await expect(page.locator('diffs-container')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Нет доступа' })
    ).toHaveCount(0);
    await page.getByRole('link', { name: 'На страницу курса' }).click();
    await expect(
      page.getByRole('heading', { name: 'Алгоритмы' })
    ).toBeVisible();
  });
}

test('a Student opens their resolved Attempt and a Teacher opens another Student’s Attempt', async ({
  page,
}) => {
  test.slow();
  await selectAccessSession(page, 'sasha', 'world:review');
  await page.goto('/courses/algorithms/tasks/1/attempts/sasha/2');
  await expect(
    page.getByRole('heading', { name: 'Попытка #2: Сортировки' })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Сохранить' })).toHaveCount(0);
  await selectAccessSession(page, 'anna', 'world:review');
  await page.goto('/courses/algorithms/tasks/1/attempts/petya/1/review');
  await expect(
    page.getByRole('heading', { name: 'Попытка #1: Сортировки' })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('body')).toContainText('Петя');
});
