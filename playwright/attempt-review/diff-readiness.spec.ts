import { expect, test, type Page, type Worker } from '@playwright/test';

// The development world's session is a Teacher of this Course.
const COURSE_PATH = '/courses/modern-information-technologies';
const COURSE_TITLE = 'Современные информационные технологии';
const ATTEMPT_PATH = `${COURSE_PATH}/tasks/1/attempts/student/1`;
const REVIEW_PATH = `${ATTEMPT_PATH}/review`;
// `fail:worker`: the diff Worker script, or the Shiki WASM that the Workers
// import, does not load.
const WORKER_SCRIPT = /\/@pierre\/diffs\/dist\/worker\/worker\.js/;
const WASM = /\/@shikijs\/engine-oniguruma\/dist\/wasm-inlined\.mjs/;

function diffFailure(page: Page) {
  return page.getByRole('alert', { name: 'Не удалось показать изменения' });
}

function changedFileDiffs(page: Page) {
  return page.getByRole('button', { name: 'Скрыть изменение файла' });
}

// The first visit makes the dev server build the worker module graph and
// Shiki; on a cold CI runner that takes longer than the default 5 s.
const COLD_START = { timeout: 30_000 };

test.describe('REV-10: diff Worker readiness', () => {
  test.slow();

  test('loading becomes ready', async ({ page }) => {
    await page.goto(REVIEW_PATH);

    await expect(changedFileDiffs(page).first()).toBeVisible(COLD_START);
    await expect(page.getByText('Загружаем изменения…')).toBeHidden();
    await expect(diffFailure(page)).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Сохранить' })
    ).not.toHaveAccessibleDescription(/изменения/);
  });

  for (const [resource, url] of [
    ['Worker script', WORKER_SCRIPT],
    ['WASM', WASM],
  ] as const) {
    test(`an unavailable ${resource} fails with a retry and keeps the Review editable`, async ({
      page,
      context,
      browserName,
    }) => {
      // WebKit doesn't route the requests a Worker makes, and the WASM is
      // imported inside the Workers; the Worker script covers WebKit.
      test.skip(
        resource === 'WASM' && browserName === 'webkit',
        'Playwright cannot route Worker requests in WebKit'
      );
      // The context also routes the requests the Workers make.
      await context.route(url, (route) => route.abort());
      await page.goto(REVIEW_PATH);

      const failure = diffFailure(page);
      await expect(failure).toBeVisible(COLD_START);
      await expect(page.getByText('Загружаем изменения…')).toBeHidden();
      await expect(page.getByText('Загружаем страницу проверки…')).toBeHidden();

      const grade = page.getByRole('textbox', { name: 'Оценка за попытку' });
      await grade.fill('7');
      await expect(grade).toHaveValue('7');
      const save = page.getByRole('button', { name: 'Сохранить' });
      await expect(save).toBeDisabled();
      await expect(save).toHaveAccessibleDescription(
        'Сохранить нельзя: изменения не загрузились.'
      );

      await context.unroute(url);
      await failure.getByRole('button', { name: 'Повторить' }).click();

      await expect(changedFileDiffs(page).first()).toBeVisible(COLD_START);
      await expect(failure).toBeHidden();
      await expect(grade).toHaveValue('7');
      await expect(save).toBeEnabled();
    });
  }
});

test('REV-11: only the Attempt page and the Review editor run diff Workers', async ({
  page,
}) => {
  test.slow();
  const workers: Worker[] = [];
  page.on('worker', (worker) => workers.push(worker));
  await page.goto(COURSE_PATH);
  await expect(page.getByRole('heading', { name: COURSE_TITLE })).toBeVisible();

  await page.getByRole('link', { name: 'Попытки' }).click();
  await expect(page).toHaveURL(`${COURSE_PATH}/attempts`);
  await expect(page.getByText('Фильтры').first()).toBeVisible();
  expect(workers).toHaveLength(0);

  await page.goto(ATTEMPT_PATH);
  await expect(changedFileDiffs(page).first()).toBeVisible(COLD_START);
  expect(workers.length).toBeGreaterThan(0);
  const closed = workers.map((worker) => worker.waitForEvent('close'));

  // Leaving the Attempt page in the app terminates its Workers.
  await page
    .getByRole('navigation', { name: 'Разделы страницы' })
    .getByRole('link', { name: 'Курс' })
    .click();
  await expect(page.getByRole('heading', { name: COURSE_TITLE })).toBeVisible();
  await Promise.all(closed);
});
