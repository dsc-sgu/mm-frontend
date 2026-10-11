import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  blockHandle,
  blockWithText,
  dragBlockOnto,
  dragBlockWithKeyboard,
  openEmptyEditor,
  readBlockTexts,
  readCaretBlock,
  runBlockCommand,
  transformBlock,
  typeBlocks,
} from './editor';

// DOC-18: focus after structural commands. The outcome is the block that
// holds the caret, not how the editor gets it there.

// Slices of #119: 4 «Структурные команды и фокус» brings one undo step per
// command with focus on the affected block and shortcuts read from
// `KeyboardEvent` (DOC-22); 5 «DnD и выделение» turns drag into commands.
const DOC4 = 'DOC4, https://github.com/dsc-sgu/mm-frontend/issues/119';
const DOC5 = 'DOC5, https://github.com/dsc-sgu/mm-frontend/issues/119';

const BLOCKS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
const BETA_BELOW_GAMMA = ['Alpha', 'Gamma', 'Beta', 'Delta', 'Epsilon'];

// Fixture `doc:all-blocks`, limited to the kinds typing can create: heading,
// paragraph, list item, quote, paragraph.
async function typeAllBlocks(page: Page, editable: Locator) {
  await typeBlocks(page, ['## Alpha', 'Beta', '- Gamma', '']);
  await page.keyboard.press('Enter');
  await page.keyboard.type('> Delta');
  await page.keyboard.press('ControlOrMeta+Enter');
  await page.keyboard.type('Epsilon');
  await expectBlocks(editable, BLOCKS);
}

function expectBlocks(editable: Locator, texts: string[]) {
  return expect.poll(() => readBlockTexts(editable)).toEqual(texts);
}

function expectCaretIn(editable: Locator, index: number, text: string) {
  return expect.poll(() => readCaretBlock(editable)).toEqual({ index, text });
}

test.describe('DOC-18: фокус после команд', () => {
  let editable: Locator;

  test.beforeEach(async ({ page }) => {
    editable = await openEmptyEditor(page);
    await typeAllBlocks(page, editable);
  });

  test('«Добавить ниже» ставит каретку в новый блок', async () => {
    await runBlockCommand(blockWithText(editable, 'Alpha'), 'Добавить ниже');

    await expectBlocks(editable, [
      'Alpha',
      '',
      'Beta',
      'Gamma',
      'Delta',
      'Epsilon',
    ]);
    await expectCaretIn(editable, 1, '');
  });

  test('«Добавить выше» ставит каретку в новый блок', async () => {
    await runBlockCommand(blockWithText(editable, 'Delta'), 'Добавить выше');

    await expectBlocks(editable, [
      'Alpha',
      'Beta',
      'Gamma',
      '',
      'Delta',
      'Epsilon',
    ]);
    await expectCaretIn(editable, 3, '');
  });

  test('«Дублировать» ставит каретку в копию', async () => {
    await runBlockCommand(blockWithText(editable, 'Delta'), 'Дублировать');

    await expectBlocks(editable, [
      'Alpha',
      'Beta',
      'Gamma',
      'Delta',
      'Delta',
      'Epsilon',
    ]);
    await expectCaretIn(editable, 4, 'Delta');
  });

  test('«Переместить вверх» оставляет каретку в блоке', async () => {
    await runBlockCommand(
      blockWithText(editable, 'Gamma'),
      'Переместить вверх'
    );

    await expectBlocks(editable, BETA_BELOW_GAMMA);
    await expectCaretIn(editable, 1, 'Gamma');
  });

  test('«Переместить вниз» оставляет каретку в блоке', async () => {
    await runBlockCommand(blockWithText(editable, 'Beta'), 'Переместить вниз');

    await expectBlocks(editable, BETA_BELOW_GAMMA);
    await expectCaretIn(editable, 2, 'Beta');
  });

  test('«Удалить» ставит каретку в блок на месте удалённого', async () => {
    await runBlockCommand(blockWithText(editable, 'Beta'), 'Удалить');

    await expectBlocks(editable, ['Alpha', 'Gamma', 'Delta', 'Epsilon']);
    await expectCaretIn(editable, 1, 'Gamma');
  });

  test('«Превратить в» оставляет каретку в блоке', async () => {
    await transformBlock(blockWithText(editable, 'Beta'), 'Заголовок 2');

    await expect(editable.getByRole('heading', { name: 'Beta' })).toBeVisible();
    await expectCaretIn(editable, 1, 'Beta');
  });

  test('перетаскивание оставляет каретку в перемещённом блоке', async () => {
    // The editor drops the block without focusing it.
    test.fail(true, DOC5);

    await dragBlockOnto(
      blockWithText(editable, 'Gamma'),
      blockWithText(editable, 'Alpha')
    );

    await expectBlocks(editable, [
      'Gamma',
      'Alpha',
      'Beta',
      'Delta',
      'Epsilon',
    ]);
    await expectCaretIn(editable, 0, 'Gamma');
  });

  test('undo возвращает каретку в затронутый блок', async ({ page }) => {
    // Undo restores the order but puts the caret back where typing ended.
    test.fail(true, DOC4);

    await runBlockCommand(blockWithText(editable, 'Beta'), 'Переместить вниз');
    await expectCaretIn(editable, 2, 'Beta');

    await page.keyboard.press('ControlOrMeta+z');

    await expectBlocks(editable, BLOCKS);
    await expectCaretIn(editable, 1, 'Beta');
  });

  test('redo возвращает каретку в затронутый блок', async ({
    page,
    browserName,
  }) => {
    // WebKit reports macOS in its user agent, so Slate expects Cmd+Shift+Z,
    // while the Linux keyboard sends Ctrl+Shift+Z and nothing is redone.
    test.fail(browserName === 'webkit', DOC4);

    await runBlockCommand(blockWithText(editable, 'Beta'), 'Переместить вниз');
    await expectCaretIn(editable, 2, 'Beta');
    await page.keyboard.press('ControlOrMeta+z');
    await expectBlocks(editable, BLOCKS);

    await page.keyboard.press('ControlOrMeta+Shift+z');

    await expectBlocks(editable, BETA_BELOW_GAMMA);
    await expectCaretIn(editable, 2, 'Beta');
  });

  test('перетаскивание с клавиатуры возвращает фокус на handle', async () => {
    await dragBlockWithKeyboard(blockWithText(editable, 'Beta'), 'ArrowDown');

    await expectBlocks(editable, BETA_BELOW_GAMMA);
    await expect(blockHandle(blockWithText(editable, 'Beta'))).toBeFocused();
  });
});
