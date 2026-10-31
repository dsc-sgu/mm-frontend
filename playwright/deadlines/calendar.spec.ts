import { expect, test } from '@playwright/test';
import { selectAccessSession } from '@/../playwright/course-access/control';

test('календарь читает дедлайны через HTTP из общего мок-бэкенда', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-05-25T12:00:00Z'));
  const request = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/deadlines?') && response.status() === 200
  );
  await selectAccessSession(page, 'anna', 'world:review');
  await page.goto('/');
  await request;
  await expect(
    page.getByRole('heading', { name: 'Календарь дедлайнов' })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Алгоритмы', exact: true })
    .first()
    .hover();
  await expect(page.getByText('Сортировки').first()).toBeVisible();
});
