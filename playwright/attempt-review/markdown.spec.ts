import { expect, test, type Page } from '@playwright/test';

// Attempt #2 rewrites README.md and changes TypeScript files.
const REVIEW_URL =
  '/courses/modern-information-technologies/tasks/1/attempts/student/2/review';

async function openReview(page: Page) {
  await page.goto(REVIEW_URL);

  // The first visit makes the dev server build the worker module graph and
  // Shiki; on a cold CI runner that takes longer than the default 5 s.
  const markdownView = page.getByRole('group', { name: 'Вид Markdown-файла' });
  await expect(markdownView).toBeVisible({ timeout: 30_000 });

  return markdownView;
}

test('Markdown-файл переключается между исходным и отрисованным диффом', async ({
  page,
}) => {
  test.slow();
  const markdownView = await openReview(page);

  // Only README.md is Markdown; the TypeScript files keep their header.
  await expect(markdownView).toHaveCount(1);

  await markdownView
    .getByRole('button', { name: 'Отрисованный Markdown' })
    .click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Практика' })
  ).toBeVisible();
  await expect(
    page.getByRole('deletion').filter({ hasText: 'Первое решение задачи.' })
  ).toBeVisible();
  await expect(
    page
      .getByRole('insertion')
      .filter({ hasText: 'Добавлена обработка пустого списка.' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'описании задания' })
  ).toHaveAttribute('target', '_blank');

  await markdownView.getByRole('button', { name: 'Исходный дифф' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Практика' })
  ).toBeHidden();
  await expect(
    page
      .locator('diffs-container', { has: markdownView })
      .locator('[data-line="1"]')
      .first()
  ).toContainText('# Практика');
});

test('черновик комментария к Markdown-файлу переживает смену вида', async ({
  page,
}) => {
  test.slow();
  const markdownView = await openReview(page);
  const readme = page.locator('diffs-container', { has: markdownView });

  // The comment button belongs to `@pierre/diffs` and appears only while the
  // pointer is over the line.
  await expect(async () => {
    await readme.locator('[data-line="1"]').first().hover();
    await readme.locator('[data-utility-button]').click({ timeout: 1_000 });
  }).toPass();
  // One input event: the editor syncs its value back from React state, and
  // fast key-by-key typing can race that sync on a loaded machine.
  await readme
    .locator('[contenteditable="true"]')
    .fill('Заголовок стоит уточнить');
  await expect(page.getByText('Заголовок стоит уточнить')).toBeVisible();

  await markdownView
    .getByRole('button', { name: 'Отрисованный Markdown' })
    .click();
  await expect(
    page.getByText(
      'Комментарии к строкам этого файла (1) видны в исходном диффе.'
    )
  ).toBeVisible();
  await expect(page.getByText('Заголовок стоит уточнить')).toBeHidden();

  await markdownView.getByRole('button', { name: 'Исходный дифф' }).click();
  await expect(page.getByText('Заголовок стоит уточнить')).toBeVisible();
});
