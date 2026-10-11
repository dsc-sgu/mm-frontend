import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  blockHandle,
  blockWithText,
  dragBlockOnto,
  dragBlockWithKeyboard,
  expectBlocks,
  openEmptyEditor,
  readCaretPosition,
  runBlockCommand,
  transformBlock,
  typeBlocks,
  type CaretPosition,
} from './editor';
import { PENDING_DOC4, PENDING_DOC5 } from './slices';

// DOC-18: focus after structural commands. The outcome is the block that
// holds the caret, not how the editor gets it there.

// Heading, paragraph, list item, quote, code block, spoiler and the empty
// paragraph the editor keeps after a spoiler.
const BLOCKS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', ''];
const BETA_BELOW_GAMMA = [
  'Alpha',
  'Gamma',
  'Beta',
  'Delta',
  'Epsilon',
  'Zeta',
  '',
];

// Fixture `doc:all-blocks`, limited to the kinds the editor creates without
// course resources: images, files and tasks need them.
async function typeAllBlocks(page: Page, editable: Locator) {
  await typeBlocks(page, ['## Alpha', 'Beta', '- Gamma', '', '> Delta']);
  await page.keyboard.press('ControlOrMeta+Enter');
  await page.keyboard.type('```Epsilon');
  await page.keyboard.press('ControlOrMeta+Enter');
  await page.keyboard.type('/спойлер');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Zeta');
  await expectBlocks(editable, BLOCKS);
}

function inBlock(index: number, text: string): CaretPosition {
  return { status: 'in-block', index, text };
}

function expectCaretIn(editable: Locator, index: number, text: string) {
  return expect
    .poll(() => readCaretPosition(editable))
    .toEqual(inBlock(index, text));
}

// Passes when the caret is in one of `blocks`; a failure shows where it is.
function expectCaretInOneOf(editable: Locator, blocks: [number, string][]) {
  return expect
    .poll(async () => {
      const caret = await readCaretPosition(editable);
      const isInOne =
        caret.status === 'in-block' &&
        blocks.some(
          ([index, text]) => caret.index === index && caret.text === text
        );

      return isInOne ? 'in one of the blocks' : caret;
    })
    .toBe('in one of the blocks');
}

test.describe('DOC-18: фокус после команд', () => {
  let editable: Locator;

  test.beforeEach(async ({ page }) => {
    editable = await openEmptyEditor(page);
    await typeAllBlocks(page, editable);
  });

  test('«Добавить ниже» ставит каретку в новый блок', async () => {
    await runBlockCommand(blockWithText(editable, 'Alpha'), 'Добавить ниже');

    await expectBlocks(editable, ['Alpha', '', ...BLOCKS.slice(1)]);
    await expectCaretIn(editable, 1, '');
  });

  test('«Добавить выше» ставит каретку в новый блок', async () => {
    await runBlockCommand(blockWithText(editable, 'Delta'), 'Добавить выше');

    await expectBlocks(editable, [
      ...BLOCKS.slice(0, 3),
      '',
      ...BLOCKS.slice(3),
    ]);
    await expectCaretIn(editable, 3, '');
  });

  test('«Дублировать» ставит каретку в копию', async () => {
    await runBlockCommand(blockWithText(editable, 'Epsilon'), 'Дублировать');

    await expectBlocks(editable, [
      ...BLOCKS.slice(0, 5),
      'Epsilon',
      ...BLOCKS.slice(5),
    ]);
    await expectCaretIn(editable, 5, 'Epsilon');
  });

  test('«Переместить вверх» оставляет каретку в блоке', async () => {
    await runBlockCommand(blockWithText(editable, 'Zeta'), 'Переместить вверх');

    await expectBlocks(editable, [
      ...BLOCKS.slice(0, 4),
      'Zeta',
      'Epsilon',
      '',
    ]);
    await expectCaretIn(editable, 4, 'Zeta');
  });

  test('«Переместить вниз» оставляет каретку в блоке', async () => {
    await runBlockCommand(blockWithText(editable, 'Beta'), 'Переместить вниз');

    await expectBlocks(editable, BETA_BELOW_GAMMA);
    await expectCaretIn(editable, 2, 'Beta');
  });

  test('«Удалить» ставит каретку в соседний блок', async () => {
    await runBlockCommand(blockWithText(editable, 'Beta'), 'Удалить');

    await expectBlocks(editable, ['Alpha', ...BLOCKS.slice(2)]);
    // No contract picks the previous or the next block.
    await expectCaretInOneOf(editable, [
      [0, 'Alpha'],
      [1, 'Gamma'],
    ]);
  });

  test('«Превратить в» оставляет каретку в блоке', async () => {
    await transformBlock(blockWithText(editable, 'Beta'), 'Заголовок 2');

    await expect(editable.getByRole('heading', { name: 'Beta' })).toBeVisible();
    await expectCaretIn(editable, 1, 'Beta');
  });

  test('перетаскивание оставляет каретку в перемещённом блоке', async () => {
    // The editor drops the block without focusing it.
    test.fail(true, PENDING_DOC5);

    await dragBlockOnto(
      blockWithText(editable, 'Gamma'),
      blockWithText(editable, 'Alpha')
    );

    await expectBlocks(editable, [
      'Gamma',
      'Alpha',
      'Beta',
      ...BLOCKS.slice(3),
    ]);
    await expectCaretIn(editable, 0, 'Gamma');
  });

  test('undo возвращает каретку в затронутый блок', async ({ page }) => {
    // Undo restores the order but puts the caret back where typing ended.
    test.fail(true, PENDING_DOC4);

    await runBlockCommand(blockWithText(editable, 'Beta'), 'Переместить вниз');
    await expectCaretIn(editable, 2, 'Beta');

    await page.keyboard.press('ControlOrMeta+z');

    await expectBlocks(editable, BLOCKS);
    await expectCaretIn(editable, 1, 'Beta');
  });

  test('redo возвращает каретку в затронутый блок', async ({ page }) => {
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
