import { KEYS, type Path, type Range, type SlateEditor } from 'platejs';

import {
  transformBlock,
  type CreatePlateBlockInput,
} from '@/features/course/features/page-edit/model/block-operations';
import type {
  CoursePlateElement,
  CoursePlateText,
} from '@/features/course/features/page-edit/model/plate-content';

export type CoursePageSlashMenuItem = {
  description: string;
  id: string;
  input: CreatePlateBlockInput;
  keywords: string[];
  label: string;
};

export type CoursePageSlashMenuState =
  | { status: 'closed' }
  | {
      blockPath: Path;
      query: string;
      status: 'open';
      triggerId: string;
      triggerRange: Range;
    };

export const COURSE_PAGE_SLASH_MENU_ITEMS: CoursePageSlashMenuItem[] = [
  {
    id: 'heading-1',
    label: 'Заголовок 1',
    description: 'Крупный заголовок раздела',
    keywords: ['h1', 'заголовок', 'раздел'],
    input: { type: 'heading', level: 1 },
  },
  {
    id: 'heading-2',
    label: 'Заголовок 2',
    description: 'Заголовок подраздела',
    keywords: ['h2', 'заголовок', 'подраздел'],
    input: { type: 'heading', level: 2 },
  },
  {
    id: 'heading-3',
    label: 'Заголовок 3',
    description: 'Небольшой заголовок',
    keywords: ['h3', 'заголовок'],
    input: { type: 'heading', level: 3 },
  },
  {
    id: 'quote',
    label: 'Цитата',
    description: 'Выделенная цитата или примечание',
    keywords: ['quote', 'цитата', 'врезка'],
    input: { type: 'quote' },
  },
  {
    id: 'bulleted-list',
    label: 'Маркированный список',
    description: 'Список с маркерами',
    keywords: ['bullets', 'list', 'маркер', 'список'],
    input: { type: 'list', variant: 'unordered' },
  },
  {
    id: 'ordered-list',
    label: 'Нумерованный список',
    description: 'Список с нумерацией',
    keywords: ['list', 'number', 'нумерованный', 'список'],
    input: { type: 'list', variant: 'ordered' },
  },
  {
    id: 'code',
    label: 'Код',
    description: 'Блок с фрагментом кода',
    keywords: ['code', 'код', 'программа'],
    input: { type: 'code' },
  },
  {
    id: 'spoiler',
    label: 'Спойлер',
    description: 'Сворачиваемый блок с деталями',
    keywords: ['details', 'toggle', 'спойлер'],
    input: { type: 'spoiler' },
  },
];

function isCoursePlateText(node: unknown): node is CoursePlateText {
  return (
    typeof node === 'object' &&
    node !== null &&
    'text' in node &&
    typeof (node as { text?: unknown }).text === 'string'
  );
}

function isCoursePlateElement(node: unknown): node is CoursePlateElement {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    'children' in node &&
    Array.isArray((node as { children?: unknown }).children)
  );
}

function isCollapsedRange(range: Range) {
  return (
    range.anchor.offset === range.focus.offset &&
    range.anchor.path.length === range.focus.path.length &&
    range.anchor.path.every(
      (segment, index) => segment === range.focus.path[index]
    )
  );
}

export function getCoursePageSlashMenuState({
  selection,
  value,
}: {
  selection: Range | null;
  value: CoursePlateElement[];
}): CoursePageSlashMenuState {
  if (!selection || !isCollapsedRange(selection)) {
    return { status: 'closed' };
  }

  const textPath = selection.anchor.path;

  if (textPath.length !== 2 || textPath[1] !== 0) {
    return { status: 'closed' };
  }

  const blockPath = [textPath[0]];
  const block = value[blockPath[0]];

  if (
    !isCoursePlateElement(block) ||
    block.type !== KEYS.p ||
    typeof block.id !== 'string'
  ) {
    return { status: 'closed' };
  }

  if (block.listStyleType || block.children.length !== 1) {
    return { status: 'closed' };
  }

  const text = block.children[0];

  if (
    !isCoursePlateText(text) ||
    selection.anchor.offset !== text.text.length
  ) {
    return { status: 'closed' };
  }

  const triggerText = text.text.slice(0, selection.anchor.offset);

  if (!triggerText.startsWith('/')) {
    return { status: 'closed' };
  }

  return {
    status: 'open',
    blockPath,
    query: triggerText.slice(1),
    triggerId: block.id,
    triggerRange: {
      anchor: { path: textPath, offset: 0 },
      focus: selection.anchor,
    },
  };
}

export function hasCoursePageSlashMenuTrigger({
  triggerId,
  value,
}: {
  triggerId: string;
  value: CoursePlateElement[];
}) {
  const block = value.find(
    (candidate) => isCoursePlateElement(candidate) && candidate.id === triggerId
  );
  const firstChild = block?.children[0];

  return isCoursePlateText(firstChild) && firstChild.text.startsWith('/');
}

export function filterCoursePageSlashMenuItems(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return COURSE_PAGE_SLASH_MENU_ITEMS;
  }

  return COURSE_PAGE_SLASH_MENU_ITEMS.filter((item) =>
    [item.label, ...item.keywords].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )
  );
}

export function applyCoursePageSlashMenuItem({
  editor,
  item,
  state,
}: {
  editor: SlateEditor;
  item: CoursePageSlashMenuItem;
  state: Extract<CoursePageSlashMenuState, { status: 'open' }>;
}) {
  editor.tf.delete({ at: state.triggerRange });

  return transformBlock(editor, state.blockPath, item.input);
}
