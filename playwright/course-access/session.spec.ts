import { expect, test } from '@playwright/test';
import { selectAccessSession } from './control';

test('ACC-E4: after Vera logs out and Sasha logs in, no Vera Course, role or navigation appears', async ({
  page,
}) => {
  await selectAccessSession(page, 'vera');
  await page.goto('/courses/databases');
  const navigation = page.getByRole('navigation', { name: 'Разделы страницы' });
  await expect(
    navigation.getByRole('link', { name: 'Редактирование' })
  ).toBeVisible();

  // Every committed DOM state from the first screen after Vera's Course page
  // on is checked, so a frame that briefly shows Vera's Course, Teacher role
  // or navigation fails. Her page may stay until the logout is confirmed.
  await page.evaluate(() => {
    const leaks: string[] = [];
    const checked = new Set<string>();
    let left = false;
    const inspect = () => {
      left ||= location.pathname !== '/courses/databases';
      if (!left) return;
      checked.add(location.pathname);
      const header = document.querySelector('header')?.textContent ?? '';
      if (header.includes('Базы данных') || header.includes('БД')) {
        leaks.push(`header metadata at ${location.pathname}`);
      }
      if (
        document.querySelector(
          'a[href="/courses/databases"], a[href^="/courses/databases/"]'
        )
      ) {
        leaks.push(`Course link at ${location.pathname}`);
      }
      if (
        [...document.querySelectorAll('h1, h2')].some((heading) =>
          heading.textContent?.includes('Базы данных')
        )
      ) {
        leaks.push(`Course heading at ${location.pathname}`);
      }
      if (
        [...document.querySelectorAll('a')].some(
          (link) => link.textContent?.trim() === 'Редактирование'
        )
      ) {
        leaks.push(`Teacher navigation at ${location.pathname}`);
      }
    };
    Object.assign(window, {
      __sessionLeaks: leaks,
      __sessionChecked: checked,
      __inspectSession: inspect,
    });
  });
  await page.getByRole('button', { name: 'Меню пользователя' }).click();
  await page.evaluate(() => {
    const observer = new MutationObserver(() =>
      (window as unknown as { __inspectSession: () => void }).__inspectSession()
    );
    // Start observing only once Vera's own session is being closed.
    document.addEventListener(
      'click',
      () =>
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
        }),
      { capture: true, once: true }
    );
  });
  await page.getByRole('menuitem', { name: 'Выход' }).click();

  await expect(page).toHaveURL('/login');
  await page.getByLabel('Email').fill('sasha@example.com');
  await page.getByLabel('Пароль').fill('Access123');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL('/');
  const algorithms = page.getByRole('link', { name: 'Алгоритмы' });
  await expect(algorithms).toBeVisible();
  // Same tab, no reload: the in-app transition must not reuse Vera's cache.
  await algorithms.click();
  await expect(page.getByRole('heading', { name: 'Алгоритмы' })).toBeVisible();
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Редактирование' })
  ).toHaveCount(0);

  const { leaks, checked } = await page.evaluate(() => {
    const state = window as unknown as {
      __sessionLeaks: string[];
      __sessionChecked: Set<string>;
    };
    return {
      leaks: state.__sessionLeaks,
      checked: [...state.__sessionChecked],
    };
  });
  expect(checked).toEqual(
    expect.arrayContaining(['/login', '/', '/courses/algorithms'])
  );
  expect(leaks).toEqual([]);
});
