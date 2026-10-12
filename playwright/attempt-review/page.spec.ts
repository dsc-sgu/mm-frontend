import { expect, test } from '@playwright/test';

// The review page waits for the `@pierre/diffs` Web Workers. With the MSW
// mock backend, a service worker controls the page and its workers; Firefox
// never runs a module worker whose script a service worker answered
// (mswjs/msw#2654), and the page stayed on its loading state.
test('страница проверки попытки открывается с mock backend', async ({
  page,
}) => {
  test.slow();
  await page.goto(
    '/courses/modern-information-technologies/tasks/1/attempts/student/1/review'
  );

  // The first visit makes the dev server build the worker module graph and
  // Shiki; on a cold CI runner that takes longer than the default 5 s.
  await expect(
    page.getByRole('heading', {
      name: 'Попытка #1: Вводное практическое задание',
    })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Загружаем страницу проверки…')).toBeHidden();
});
