import { expect, test } from '@playwright/test';
import {
  controlMockBackend,
  selectAccessSession,
  waitForHeldCourseLookup,
} from './control';

const ALGORITHMS_PATH = '/courses/algorithms';
const DATABASES_PATH = '/courses/databases';
const MISSING_PATH = '/courses/missing-course';

test('ACC-E3: a Guest sees identical Course 404s for non-membership and an unknown slug', async ({
  page,
}) => {
  await selectAccessSession(page, 'guest');
  await page.goto(ALGORITHMS_PATH);
  await expect(
    page.getByRole('heading', { name: 'Страница не найдена' })
  ).toBeVisible();
  await expect(page).toHaveURL(ALGORITHMS_PATH);
  await expect(page.getByRole('link', { name: 'К моим курсам' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Разделы страницы' })
  ).toHaveCount(0);
  const notMemberText = await page.getByRole('main').innerText();

  // A full navigation also proves the chosen world and Guest session persist.
  await page.goto(MISSING_PATH);
  await expect(
    page.getByRole('heading', { name: 'Страница не найдена' })
  ).toBeVisible();
  await expect(page).toHaveURL(MISSING_PATH);
  await expect(page.getByRole('main')).toHaveText(notMemberText, {
    useInnerText: true,
  });
  await expect(
    page.getByRole('navigation', { name: 'Навигационная цепочка' })
  ).toHaveCount(0);
});

test('ACC-E5: Vera never sees Database metadata or Teacher navigation under the Algorithms URL', async ({
  page,
}) => {
  await selectAccessSession(page, 'vera');
  await page.goto(DATABASES_PATH);
  await expect(
    page.getByRole('heading', { name: 'Базы данных' })
  ).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Разделы страницы' });
  await expect(
    navigation.getByRole('link', { name: 'Редактирование' })
  ).toBeVisible();
  await controlMockBackend(page, {
    action: 'hold',
    operation: 'load-course',
  });

  try {
    const frames = await page.evaluate(async (path) => {
      const observations: {
        pathname: string;
        oldMetadata: boolean;
        oldNavigation: boolean;
        neutralOrConfirmedNew: boolean;
      }[] = [];
      // The router observes the browser History API. This is a client-side
      // transition without a reload or a test-only production router handle.
      window.history.pushState({}, '', path);
      for (let frame = 0; frame < 12; frame += 1) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        const header = document.querySelector('header');
        const navigation = header?.querySelector(
          'nav[aria-label="Разделы страницы"]'
        );
        const text = document.body.innerText;
        const confirmedNew =
          header?.textContent?.includes('Алгоритмы') ?? false;
        observations.push({
          pathname: window.location.pathname,
          oldMetadata:
            text.includes('Базы данных') ||
            (header?.textContent?.includes('БД') ?? false),
          oldNavigation:
            Boolean(
              navigation?.querySelector('a[href*="/courses/databases"]')
            ) ||
            (navigation?.textContent?.includes('Редактирование') ?? false),
          // A confirmed new cache is permitted to display immediately while
          // this operation is held; unconfirmed context has no navigation.
          neutralOrConfirmedNew: !navigation || confirmedNew,
        });
      }
      return observations;
    }, ALGORITHMS_PATH);

    await waitForHeldCourseLookup(page);
    await expect(page).toHaveURL(ALGORITHMS_PATH);
    expect(frames).toHaveLength(12);
    for (const frame of frames) {
      expect(frame.pathname).toBe(ALGORITHMS_PATH);
      expect(frame.oldMetadata).toBe(false);
      expect(frame.oldNavigation).toBe(false);
      expect(frame.neutralOrConfirmedNew).toBe(true);
    }
    await expect(
      page.getByRole('status', { name: 'Загрузка страницы' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Базы данных' })
    ).toHaveCount(0);
    await expect(navigation).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Навигационная цепочка' })
    ).toHaveCount(0);
  } finally {
    await controlMockBackend(page, {
      action: 'release',
      operation: 'load-course',
    });
  }

  await expect(page.getByRole('heading', { name: 'Алгоритмы' })).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Репозиторий', exact: true })
  ).toHaveAttribute('href', '/courses/algorithms/repositories/vera');
  await expect(
    navigation.getByRole('link', { name: 'Редактирование' })
  ).toHaveCount(0);
});
