import { expect, test } from '@playwright/test';
const URL =
  '/courses/modern-information-technologies/tasks/1/attempts/student/2/review';
test('REV-16: вставка очищает HTML и сохраняет простой текст без ссылок', async ({
  page,
}) => {
  test.slow();
  await page.goto(URL);
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible({ timeout: 30000 });
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await editor.press('Backspace');
  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.setData(
      'text/html',
      '<div><p>Первый <strong>жирный</strong></p><p>Второй</p><ul><li>Пункт</li></ul><h1>Заголовок</h1><img src=x><script>bad()</script><style>body{display:none}</style></div>'
    );
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    element.dispatchEvent(event);
  });
  await expect(editor).toContainText('Первый жирный');
  await expect(editor).toContainText('Второй');
  await expect(editor.locator('strong')).toHaveText('жирный');
  await expect(editor.locator('img,script,style,h1')).toHaveCount(0);
  await expect(editor).not.toContainText('bad()');
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await editor.press('Backspace');
  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'https://example.com');
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    element.dispatchEvent(event);
  });
  await expect(editor).toContainText('https://example.com');
  await expect(editor.locator('a,[data-slate-type="a"]')).toHaveCount(0);
});
test('REV-18: диалог отклоняет адрес и возвращает фокус', async ({ page }) => {
  test.slow();
  await page.goto(URL);
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible({ timeout: 30000 });
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await editor.press('Backspace');
  await editor.pressSequentially('Ссылка');
  await editor.press('ControlOrMeta+a');
  await page
    .getByRole('button', { name: 'Ссылка', exact: true })
    .first()
    .click();
  const field = page.getByLabel('Адрес ссылки');
  await field.fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Вставить', exact: true }).click();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await field.fill('https://example.com');
  await page.getByRole('button', { name: 'Вставить', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(editor).toBeFocused();
});

test('форматирование, цитата и блок кода доступны в редакторе проверки', async ({
  page,
}) => {
  test.slow();
  await page.goto(URL);
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible({ timeout: 30000 });
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await editor.press('Backspace');
  await editor.pressSequentially('Проверка форматирования');
  await expect(editor).toContainText('Проверка форматирования');
  await editor.press('Home');
  await editor.press('Shift+End');
  for (const name of ['Жирный текст', 'Курсив', 'Зачёркнутый текст']) {
    await page.getByRole('button', { name, exact: true }).first().click();
    await expect(editor).toContainText('Проверка форматирования');
  }
  await expect(editor.locator('strong')).toContainText(
    'Проверка форматирования'
  );
  await expect(editor.locator('em')).toContainText('Проверка форматирования');
  await expect(editor.locator('s')).toContainText('Проверка форматирования');
  await page
    .getByRole('button', { name: 'Цитата', exact: true })
    .first()
    .click();
  await expect(editor.locator('blockquote')).toContainText(
    'Проверка форматирования'
  );
  await page
    .getByRole('button', { name: 'Блок кода', exact: true })
    .first()
    .click();
  await expect(editor.locator('pre')).toContainText('Проверка форматирования');
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await expect(editor).toContainText('Решение стало устойчивее.');
});
