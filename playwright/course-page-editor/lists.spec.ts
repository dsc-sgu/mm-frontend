import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  applyChanges,
  blockWithText,
  dragBlockOnto,
  openEmptyEditor,
  openReadOnlyPage,
  placeCaret,
  readBlockTexts,
  readListOutline,
  reopenEditor,
  runBlockCommand,
  transformBlock,
  typeBlocks,
} from './editor';

// DOC-14: list numbering scenarios from #74, fixture `doc:lists-74`. The
// tests type every list themselves and assert only what the reader sees.

function expectOutline(scope: Locator, outline: string[]) {
  return expect.poll(() => readListOutline(scope)).toEqual(outline);
}

type SavedListDocument = {
  name: string;
  outline: string[];
  // The slice that brings the behaviour, while the current editor lacks it.
  pendingSlice?: string;
  type: (page: Page, editable: Locator) => Promise<void>;
};

// Slice 1 of #119 «Документ v1 и read-only renderer»: #74 rules as one
// grouping function for the editor and the renderer, no hidden list id.
const DOC1 = 'DOC1, https://github.com/dsc-sgu/mm-frontend/issues/119';
// Slice 5 of #119 «DnD и выделение»: multi-drag of selected blocks.
const DOC5 = 'DOC5, https://github.com/dsc-sgu/mm-frontend/issues/119';

// Documents for the save and read-only checks. Each one isolates a #74 rule,
// so a rule the current editor breaks fails only its own tests.
const SAVED_LIST_DOCUMENTS: SavedListDocument[] = [
  {
    name: 'уровни, разрыв абзацем, маркеры',
    outline: [
      '1. Alpha',
      '  1. Nested one',
      '  2. Nested two',
      '2. Beta',
      '• Bullet one',
      '• Bullet two',
    ],
    async type(page) {
      await typeBlocks(page, ['1. Alpha']);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      await typeBlocks(page, ['Nested one', 'Nested two']);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Shift+Tab');
      await typeBlocks(page, [
        'Beta',
        '',
        'Break',
        '- Bullet one',
        'Bullet two',
      ]);
    },
  },
  {
    name: 'items из отдельных команд',
    outline: ['1. Alpha', '2. Beta', '3. Gamma'],
    // Each command gives its item its own hidden list id, and saving splits
    // the run into three lists: 1, 1, 1.
    pendingSlice: DOC1,
    async type(page, editable) {
      await typeBlocks(page, ['Alpha', 'Beta', 'Gamma']);

      for (const text of ['Alpha', 'Beta', 'Gamma']) {
        await transformBlock(
          blockWithText(editable, text),
          'Нумерованный список'
        );
      }
    },
  },
];

test.describe('DOC-14: нумерация списков', () => {
  test('три ordered items нумеруются 1, 2, 3, а не 1, 1, 1', async ({
    page,
  }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha', 'Beta', 'Gamma']);

    await expectOutline(editable, ['1. Alpha', '2. Beta', '3. Gamma']);
  });

  test('команда «Нумерованный список» создаёт серию', async ({ page }) => {
    const editable = await openEmptyEditor(page);

    await page.keyboard.type('/нумер');
    await page.keyboard.press('Enter');
    await typeBlocks(page, ['Alpha', 'Beta', 'Gamma']);

    await expectOutline(editable, ['1. Alpha', '2. Beta', '3. Gamma']);
  });

  test('абзацы, превращённые командой по одному, продолжают серию', async ({
    page,
  }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['Alpha', 'Beta', 'Gamma']);

    for (const text of ['Alpha', 'Beta', 'Gamma']) {
      await transformBlock(
        blockWithText(editable, text),
        'Нумерованный список'
      );
    }

    await expectOutline(editable, ['1. Alpha', '2. Beta', '3. Gamma']);
  });

  test('Enter в непустом item создаёт следующий sibling', async ({ page }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. AlphaBeta', 'Gamma']);
    await placeCaret(editable, 'AlphaBeta', 'Alpha'.length);

    await page.keyboard.press('Enter');

    await expectOutline(editable, ['1. Alpha', '2. Beta', '3. Gamma']);
  });

  test('пустой Enter поднимает вложенный item, на уровне 1 выводит из списка', async ({
    page,
  }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha']);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await typeBlocks(page, ['Nested', '']);
    await page.keyboard.press('Enter');
    await page.keyboard.type('Beta');

    await expectOutline(editable, ['1. Alpha', '  1. Nested', '2. Beta']);

    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('After');

    await expectOutline(editable, ['1. Alpha', '  1. Nested', '2. Beta']);
    await expect
      .poll(() => readBlockTexts(editable))
      .toEqual(['Alpha', 'Nested', 'Beta', 'After']);
  });

  test('Backspace в начале поднимает вложенный item, затем выводит из списка', async ({
    page,
  }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha']);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await typeBlocks(page, ['Nested']);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('Beta');
    await placeCaret(editable, 'Nested', 0);

    await page.keyboard.press('Backspace');

    await expectOutline(editable, ['1. Alpha', '2. Nested', '3. Beta']);

    await page.keyboard.press('Backspace');

    await expectOutline(editable, ['1. Alpha', '1. Beta']);
    await expect
      .poll(() => readBlockTexts(editable))
      .toEqual(['Alpha', 'Nested', 'Beta']);
  });

  test('Tab вкладывает item без разрыва серии родителя, Shift+Tab поднимает', async ({
    page,
  }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha', 'Beta', 'Gamma']);
    await placeCaret(editable, 'Beta');

    await page.keyboard.press('Tab');

    await expectOutline(editable, ['1. Alpha', '  1. Beta', '2. Gamma']);

    await page.keyboard.press('Shift+Tab');

    await expectOutline(editable, ['1. Alpha', '2. Beta', '3. Gamma']);
  });

  test('смена ordered → unordered → ordered даёт 1 / • / 1', async ({
    page,
  }) => {
    // The editor continues the ordered run across the bullet: 1 / • / 2.
    test.fail(true, DOC1);

    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha', 'Beta', 'Gamma']);

    await transformBlock(
      blockWithText(editable, 'Beta'),
      'Маркированный список'
    );

    await expectOutline(editable, ['1. Alpha', '• Beta', '1. Gamma']);

    await transformBlock(
      blockWithText(editable, 'Beta'),
      'Нумерованный список'
    );

    await expectOutline(editable, ['1. Alpha', '2. Beta', '3. Gamma']);
  });

  test('абзац разрывает серию, его удаление снова её объединяет', async ({
    page,
  }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha', 'Beta', 'Gamma']);
    await runBlockCommand(blockWithText(editable, 'Alpha'), 'Добавить ниже');
    await page.keyboard.type('Break');

    await expectOutline(editable, ['1. Alpha', '1. Beta', '2. Gamma']);

    await runBlockCommand(blockWithText(editable, 'Break'), 'Удалить');

    await expectOutline(editable, ['1. Alpha', '2. Beta', '3. Gamma']);
  });

  test('удаление item перенумеровывает серию', async ({ page }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha', 'Beta', 'Gamma']);

    await runBlockCommand(blockWithText(editable, 'Beta'), 'Удалить');

    await expectOutline(editable, ['1. Alpha', '2. Gamma']);
  });

  test('перетаскивание одного item перенумеровывает серию', async ({
    page,
  }) => {
    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha', 'Beta', 'Gamma']);

    await dragBlockOnto(
      blockWithText(editable, 'Gamma'),
      blockWithText(editable, 'Alpha')
    );

    await expectOutline(editable, ['1. Gamma', '2. Alpha', '3. Beta']);
  });

  test('перетаскивание выделенных items переносит их группой', async ({
    page,
  }) => {
    // The editor drags only the block under the handle.
    test.fail(true, DOC5);

    const editable = await openEmptyEditor(page);

    await typeBlocks(page, ['1. Alpha', 'Beta', 'Gamma', 'Delta']);
    await blockWithText(editable, 'Alpha').getByText('Alpha').click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Shift+ArrowDown');
    await expect(
      page.getByRole('toolbar', { name: 'Действия с выбранными блоками' })
    ).toContainText('2 блока');

    await dragBlockOnto(
      blockWithText(editable, 'Alpha'),
      blockWithText(editable, 'Delta')
    );

    await expectOutline(editable, [
      '1. Gamma',
      '2. Delta',
      '3. Alpha',
      '4. Beta',
    ]);
  });

  for (const listDocument of SAVED_LIST_DOCUMENTS) {
    test(`после Apply и повторного открытия номера те же: ${listDocument.name}`, async ({
      page,
    }) => {
      test.fail(
        listDocument.pendingSlice !== undefined,
        listDocument.pendingSlice
      );

      const editable = await openEmptyEditor(page);

      await listDocument.type(page, editable);
      await expectOutline(editable, listDocument.outline);

      await applyChanges(page);

      await expectOutline(await reopenEditor(page), listDocument.outline);
    });

    test(`read-only показывает те же номера, что редактор: ${listDocument.name}`, async ({
      page,
    }) => {
      test.fail(
        listDocument.pendingSlice !== undefined,
        listDocument.pendingSlice
      );

      const editable = await openEmptyEditor(page);

      await listDocument.type(page, editable);
      await expectOutline(editable, listDocument.outline);

      await applyChanges(page);

      await expectOutline(await openReadOnlyPage(page), listDocument.outline);
    });
  }
});
