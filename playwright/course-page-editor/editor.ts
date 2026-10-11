import { expect, type Locator, type Page } from '@playwright/test';
import {
  getEditable,
  getEditorHandle,
  getSelection,
  setSelection,
} from '@platejs/playwright';

// The mock teacher can edit only this course.
const COURSE_SLUG = 'modern-information-technologies';

// Labels of the block menu commands and of its «Превратить в» submenu.
type BlockCommand =
  | 'Добавить выше'
  | 'Добавить ниже'
  | 'Дублировать'
  | 'Переместить вверх'
  | 'Переместить вниз'
  | 'Удалить';

type BlockKind =
  | 'Текст'
  | 'Заголовок 1'
  | 'Заголовок 2'
  | 'Заголовок 3'
  | 'Цитата'
  | 'Маркированный список'
  | 'Нумерованный список'
  | 'Код'
  | 'Спойлер';

export type CaretPosition =
  | { status: 'no-focus' }
  // The DOM caret and the Plate selection point at different blocks.
  | { status: 'out-of-sync'; domIndex: number; plateIndex: number | null }
  | { status: 'in-block'; index: number; text: string };

// Opens the Course Page editor and removes the mock content, so each test
// types its own document and does not depend on mock data.
export async function openEmptyEditor(page: Page) {
  await page.goto(`/courses/${COURSE_SLUG}/edit`);

  const editable = getEditable(page);

  await editable.locator('[data-slate-string]').first().click();
  // Fixture setup selects the document directly: consecutive Mod+A presses
  // can race the DOM/Plate selection sync and the block-selection focus handoff.
  await setSelection(page, await getEditorHandle(page, editable), []);
  await page.keyboard.press('Backspace');
  await expectBlocks(editable, ['']);

  return editable;
}

export function expectBlocks(editable: Locator, texts: string[]) {
  return expect.poll(() => readBlockTexts(editable)).toEqual(texts);
}

export async function typeBlocks(page: Page, lines: string[]) {
  for (const [index, line] of lines.entries()) {
    if (index > 0) {
      await page.keyboard.press('Enter');
    }

    await page.keyboard.type(line);
  }
}

// Puts the caret into the block that shows `text`, `offset` characters in.
// Keyboard navigation would race Plate, which syncs its selection from the
// DOM a moment after each key.
export async function placeCaret(
  editable: Locator,
  text: string,
  offset = text.length
) {
  const page = editable.page();
  const index = (await readBlockTexts(editable)).indexOf(text);

  if (index < 0) {
    throw new Error(`placeCaret: no block shows "${text}"`);
  }

  await setSelection(page, await getEditorHandle(page, editable), {
    path: [index, 0],
    offset,
  });
}

function sectionLink(page: Page, name: 'Курс' | 'Редактирование') {
  return page
    .getByRole('navigation', { name: 'Разделы страницы' })
    .getByRole('link', { name, exact: true });
}

// Navigates inside the app: a reload would reset the in-memory mocks.
export async function openReadOnlyPage(page: Page) {
  await sectionLink(page, 'Курс').click();
  await expect(getEditable(page)).toHaveCount(0);

  return page.getByRole('article');
}

export async function reopenEditor(page: Page) {
  await openReadOnlyPage(page);
  await sectionLink(page, 'Редактирование').click();

  const editable = getEditable(page);

  await expect(editable).toBeVisible();

  return editable;
}

export async function applyChanges(page: Page) {
  await page.getByRole('button', { name: /Применить/ }).click();
  await expect(page.getByText('Изменения применены')).toBeVisible();
}

export function topLevelBlocks(editable: Locator) {
  return editable.locator(':scope > [data-slate-node="element"]');
}

export function blockWithText(editable: Locator, text: string) {
  return topLevelBlocks(editable).filter({
    has: editable.page().getByText(text, { exact: true }),
  });
}

export function blockHandle(block: Locator) {
  return block.getByRole('button', { name: 'Открыть меню блока' }).first();
}

// Opens the block menu from the keyboard, as the handle's screen reader
// instructions describe. The pointer cannot reach the last blocks of a short
// page: the apply bar covers them as soon as the document changes.
async function openBlockMenu(block: Locator) {
  await blockHandle(block).focus();
  await block.page().keyboard.press('Enter');
}

export async function runBlockCommand(block: Locator, command: BlockCommand) {
  const page = block.page();

  await openBlockMenu(block);
  await page.getByRole('menuitem', { name: command, exact: true }).click();
  // A click dispatches the command before its scheduled focus handoff settles.
  // Wait for the editor before the caller sends another keyboard action.
  await expect(getEditable(page)).toBeFocused();
}

export async function transformBlock(block: Locator, kind: BlockKind) {
  const page = block.page();

  await openBlockMenu(block);
  await page.getByRole('menuitem', { name: 'Превратить в' }).click();
  await page.getByRole('menuitem', { name: kind, exact: true }).click();
}

// Drags a block by its handle until it takes the place of `target`. Both
// must stay above the apply bar.
export async function dragBlockOnto(block: Locator, target: Locator) {
  const page = block.page();
  const handle = blockHandle(block);

  await block.hover();

  const handleBox = await handle.boundingBox();
  const blockBox = await block.boundingBox();
  const targetBox = await target.boundingBox();

  if (!handleBox || !blockBox || !targetBox) {
    throw new Error('dragBlockOnto: block, handle or target is not visible');
  }

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const deltaY =
    targetBox.y + targetBox.height / 2 - (blockBox.y + blockBox.height / 2);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Passes the drag activation distance before heading to the target.
  await page.mouse.move(startX, startY + Math.sign(deltaY) * 12, {
    steps: 4,
  });
  await page.mouse.move(startX, startY + deltaY, { steps: 12 });
  await page.mouse.up();
}

// Selects the blocks from `first` to `last` with a selection area dragged
// from the page margin, where the editor starts block selection.
export async function selectBlocksWithArea(first: Locator, last: Locator) {
  const page = first.page();
  const firstBox = await first.boundingBox();
  const lastBox = await last.boundingBox();

  if (!firstBox || !lastBox) {
    throw new Error('selectBlocksWithArea: a block is not visible');
  }

  await page.mouse.move(16, firstBox.y - 4);
  await page.mouse.down();
  await page.mouse.move(firstBox.x + 48, lastBox.y + lastBox.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

// Moves a block one position with the keyboard sensor: Space picks it up,
// the arrow moves it, Space drops it.
export async function dragBlockWithKeyboard(
  block: Locator,
  key: 'ArrowDown' | 'ArrowUp'
) {
  const page = block.page();
  const handle = blockHandle(block);

  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');

  // A drop before the drag shows the new place would land the block where
  // it was. Rank among the blocks on screen ignores page scroll.
  const startRank = await readScreenRank(block);

  await page.keyboard.press(key);
  await expect
    .poll(() => readScreenRank(block))
    .toBe(startRank + (key === 'ArrowDown' ? 1 : -1));
  await page.keyboard.press('Space');
}

// How many top-level blocks are drawn above this one.
function readScreenRank(block: Locator) {
  return block.evaluate((element) => {
    const top = element.getBoundingClientRect().top;
    const siblings = Array.from(element.parentElement?.children ?? []);

    return siblings.filter(
      (sibling) =>
        sibling !== element &&
        sibling.matches('[data-slate-node="element"]') &&
        sibling.getBoundingClientRect().top < top
    ).length;
  });
}

// Visible text of every top-level block, without editor chrome.
export function readBlockTexts(editable: Locator) {
  return topLevelBlocks(editable).evaluateAll((blocks) =>
    blocks.map((block) => {
      const clone = block.cloneNode(true) as HTMLElement;

      clone
        .querySelectorAll('[contenteditable="false"], [aria-hidden="true"]')
        .forEach((node) => node.remove());

      return (clone.textContent ?? '').replace(/\uFEFF/g, '').trim();
    })
  );
}

// List items as the reader sees them: indentation level, marker and text.
//
// The marker is the one the browser draws for the item: for a decimal item
// it is the HTML ordinal value, so the outline does not depend on whether a
// numbered run is one `<ol>` or one `<ol start>` per item. The level is the
// rank of the item's horizontal position among all items on the page.
export function readListOutline(scope: Locator) {
  return scope.locator('li').evaluateAll((items) => {
    function ordinalValue(item: HTMLLIElement) {
      const list = item.parentElement;
      let value = list instanceof HTMLOListElement ? list.start : 1;

      for (const sibling of Array.from(list?.children ?? [])) {
        if (!(sibling instanceof HTMLLIElement)) {
          continue;
        }

        if (sibling.hasAttribute('value')) {
          value = sibling.value;
        }

        if (sibling === item) {
          return value;
        }

        value += 1;
      }

      return value;
    }

    function marker(item: HTMLLIElement) {
      const listStyleType = getComputedStyle(item).listStyleType;

      if (listStyleType === 'decimal') {
        return `${ordinalValue(item)}.`;
      }

      return listStyleType === 'none' ? '' : '•';
    }

    function ownText(item: HTMLLIElement) {
      const clone = item.cloneNode(true) as HTMLElement;

      clone
        .querySelectorAll(
          'ol, ul, [contenteditable="false"], [aria-hidden="true"]'
        )
        .forEach((node) => node.remove());

      return (clone.textContent ?? '').replace(/\uFEFF/g, '').trim();
    }

    const listItems = items.filter(
      (item): item is HTMLLIElement => item instanceof HTMLLIElement
    );
    const lefts = listItems.map((item) =>
      Math.round(item.getBoundingClientRect().left)
    );
    const levels = Array.from(new Set(lefts)).sort((a, b) => a - b);

    return listItems.map((item, index) => {
      const level = levels.indexOf(lefts[index]);

      return `${'  '.repeat(level)}${marker(item)} ${ownText(item)}`;
    });
  });
}

// Where typing would go: the top-level block that holds the caret by both
// the DOM selection and the Plate selection.
export async function readCaretPosition(
  editable: Locator
): Promise<CaretPosition> {
  const page = editable.page();
  const domIndex = await editable.evaluate((root) => {
    const selection = window.getSelection();

    if (
      document.activeElement !== root ||
      !selection?.anchorNode ||
      !root.contains(selection.anchorNode)
    ) {
      return null;
    }

    const blocks = Array.from(
      root.querySelectorAll(':scope > [data-slate-node="element"]')
    );

    return blocks.findIndex((block) => block.contains(selection.anchorNode));
  });

  if (domIndex === null) {
    return { status: 'no-focus' };
  }

  const plateSelection = await getSelection(
    page,
    await getEditorHandle(page, editable)
  );
  const plateIndex = plateSelection?.anchor.path[0] ?? null;

  if (domIndex < 0 || plateIndex !== domIndex) {
    return { status: 'out-of-sync', domIndex, plateIndex };
  }

  const texts = await readBlockTexts(editable);

  return { status: 'in-block', index: domIndex, text: texts[domIndex] };
}
