import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { selectAccessSession } from './control';

test('ACC-12 / A11Y-01: Review editor 403 has no forbidden breadcrumb links', async ({
  page,
}) => {
  await selectAccessSession(page, 'sasha', 'world:review');
  const path = '/courses/algorithms/tasks/1/attempts/sasha/1/review';
  await page.goto(path);
  await expect(
    page.getByRole('heading', { name: 'Нет доступа' })
  ).toBeVisible();
  await expect(page).toHaveURL(path);
  const breadcrumbs = page.getByRole('navigation', {
    name: 'Навигационная цепочка',
  });
  await expect(
    breadcrumbs.getByRole('link', { name: 'Попытки', exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole('status', { name: 'Загрузка страницы' })
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('ACC-E2 / A11Y-01: Sasha opens Course Attempts directly and sees an accessible 403', async ({
  page,
}) => {
  await selectAccessSession(page, 'sasha');
  const path = '/courses/algorithms/attempts?tasks=1#shared-link';
  await page.goto(path);
  await expect(
    page.getByRole('heading', { name: 'Нет доступа' })
  ).toBeVisible();
  await expect(
    page.getByText('Этот раздел доступен только преподавателям курса.')
  ).toBeVisible();
  await expect(page).toHaveURL(path);
  const navigation = page.getByRole('navigation', { name: 'Разделы страницы' });
  await expect(
    navigation.getByRole('link', { name: 'Курс', exact: true })
  ).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Журнал' })).toBeVisible();
  for (const name of [
    'Попытки',
    'Репозитории',
    'Файлы',
    'Аналитика',
    'Редактирование',
  ]) {
    await expect(
      navigation.getByRole('link', { name, exact: true })
    ).toHaveCount(0);
  }
  await expect(
    page.getByRole('status', { name: 'Загрузка страницы' })
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('link', { name: 'На страницу курса' }).click();
  await expect(page).toHaveURL('/courses/algorithms');
  await expect(page.getByRole('heading', { name: 'Алгоритмы' })).toBeVisible();
});

for (const { name, session, path, action } of [
  {
    name: 'no Membership',
    session: 'guest',
    path: '/courses/algorithms',
    action: 'К моим курсам',
  },
  {
    name: 'unknown Course',
    session: 'guest',
    path: '/courses/missing-course',
    action: 'К моим курсам',
  },
  {
    name: 'resource inside Course shell',
    session: 'sasha',
    path: '/courses/algorithms/repositories/petya',
    action: 'На страницу курса',
  },
]) {
  test(`A11Y-01: accessible 404 for ${name}`, async ({ page }) => {
    await selectAccessSession(page, session);
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'Страница не найдена' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Возможно, ссылка устарела или страница больше недоступна.'
      )
    ).toBeVisible();
    await expect(page.getByRole('link', { name: action })).toBeVisible();
    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole('status', { name: 'Загрузка страницы' })
    ).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
