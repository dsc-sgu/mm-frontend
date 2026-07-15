import { KEYS, type Path, type SlateEditor, type Value } from 'platejs';

import {
  COURSE_ASSIGNMENT_NODE,
  COURSE_FILES_NODE,
  COURSE_IMAGE_NODE,
  COURSE_SPOILER_TITLE_NODE,
  type CoursePlateElement,
  type CoursePlateInline,
} from '@/features/course/features/page-edit/model/plate-content';

export type CreatePlateBlockInput =
  | { type: 'paragraph' }
  | { type: 'heading'; level: 1 | 2 | 3 }
  | { type: 'quote' }
  | { type: 'list'; variant: 'ordered' | 'unordered' }
  | { type: 'spoiler' }
  | { type: 'code' }
  | { type: 'image'; imageId: string }
  | { type: 'files'; fileIds: string[] }
  | { type: 'assignment'; taskId: string };

export type CoursePageEditorBlockEntry = {
  element: CoursePlateElement;
  id?: string;
  path: Path;
};

type NodeWithChildren = {
  children?: unknown[];
};

function createId(prefix = 'block') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function createEmptyText(): CoursePlateInline {
  return { text: '' };
}

function createParagraph(children: CoursePlateInline[] = [createEmptyText()]) {
  return {
    id: createId('paragraph'),
    type: KEYS.p,
    children,
  } satisfies CoursePlateElement;
}

function isElementNode(node: unknown): node is CoursePlateElement {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    'children' in node &&
    Array.isArray((node as NodeWithChildren).children)
  );
}

function isTextNode(node: unknown): node is { text: string } {
  return (
    typeof node === 'object' &&
    node !== null &&
    'text' in node &&
    typeof (node as { text?: unknown }).text === 'string'
  );
}

function isInlineNode(node: unknown): node is CoursePlateInline {
  return isTextNode(node) || (isElementNode(node) && node.type === KEYS.link);
}

function getEditorValue(editor: SlateEditor): CoursePlateElement[] {
  return structuredClone(editor.children) as CoursePlateElement[];
}

function setEditorValue(editor: SlateEditor, value: CoursePlateElement[]) {
  editor.tf.setValue(value as Value);
}

function getChildrenAtPath(
  value: CoursePlateElement[],
  parentPath: Path
): unknown[] | null {
  if (parentPath.length === 0) {
    return value;
  }

  const parent = getNodeAtPath(value, parentPath);

  if (!isElementNode(parent)) {
    return null;
  }

  return parent.children;
}

function getNodeAtPath(value: unknown[], path: Path): unknown {
  return path.reduce<unknown>((current, index) => {
    if (Array.isArray(current)) {
      return current[index];
    }

    if (isElementNode(current)) {
      return current.children[index];
    }

    return undefined;
  }, value);
}

function getParentPath(path: Path): Path {
  return path.slice(0, -1);
}

function getPathIndex(path: Path) {
  return path.at(-1) ?? 0;
}

function withNewIds<T>(node: T): T {
  if (!isElementNode(node)) {
    return structuredClone(node);
  }

  const clone = structuredClone(node) as CoursePlateElement;

  if (typeof clone.id === 'string') {
    clone.id = createId(clone.id);
  }

  clone.children = clone.children.map(
    withNewIds
  ) as CoursePlateElement['children'];

  return clone as T;
}

function getPlainText(children: CoursePlateElement['children']): string {
  return children
    .map((child) => {
      if (isTextNode(child)) {
        return child.text;
      }

      if (isElementNode(child)) {
        return getPlainText(child.children);
      }

      return '';
    })
    .join('');
}

function getCodeBlockPlainText(element: CoursePlateElement): string {
  return element.children
    .map((line) => {
      if (isTextNode(line)) {
        return line.text;
      }

      if (isElementNode(line)) {
        return getPlainText(line.children);
      }

      return '';
    })
    .join('\n');
}

function getPlainTextForTransform(element: CoursePlateElement): string {
  return element.type === KEYS.codeBlock
    ? getCodeBlockPlainText(element)
    : getPlainText(element.children);
}

function getReusableInlineChildren(
  element: CoursePlateElement
): CoursePlateInline[] {
  if (element.type === KEYS.codeBlock) {
    return [{ text: getCodeBlockPlainText(element) }];
  }

  const directInlineChildren = element.children.filter(isInlineNode);

  if (directInlineChildren.length > 0) {
    return structuredClone(directInlineChildren);
  }

  const firstTextContainer = element.children.find(
    (child): child is CoursePlateElement =>
      isElementNode(child) && child.children.some(isInlineNode)
  );

  if (firstTextContainer) {
    return structuredClone(firstTextContainer.children.filter(isInlineNode));
  }

  return [{ text: getPlainTextForTransform(element) }];
}

function ensureEditorHasContent(value: CoursePlateElement[]) {
  return value.length > 0 ? value : [createParagraph()];
}

function selectPathSoon(editor: SlateEditor, path: Path) {
  queueMicrotask(() => {
    if (editor.api.hasPath(path)) {
      editor.tf.focus({ at: path, edge: 'start', retries: 3 });
    }
  });
}

function findBlockEntryByIdInChildren(
  children: unknown[],
  blockId: string,
  parentPath: Path = []
): CoursePageEditorBlockEntry | null {
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];

    if (!isElementNode(child)) {
      continue;
    }

    const path = [...parentPath, index];

    if (child.id === blockId) {
      return { element: child, id: child.id, path };
    }

    const nestedEntry = findBlockEntryByIdInChildren(
      child.children,
      blockId,
      path
    );

    if (nestedEntry) {
      return nestedEntry;
    }
  }

  return null;
}

export function createEmptyPlateBlock(
  input: CreatePlateBlockInput
): CoursePlateElement {
  switch (input.type) {
    case 'paragraph':
      return createParagraph();
    case 'heading':
      return {
        id: createId('heading'),
        type:
          input.level === 1 ? KEYS.h1 : input.level === 2 ? KEYS.h2 : KEYS.h3,
        children: [createEmptyText()],
      };
    case 'quote':
      return {
        id: createId('quote'),
        type: KEYS.blockquote,
        children: [createParagraph()],
      };
    case 'list':
      return {
        id: createId('list-item'),
        type: KEYS.p,
        listStyleType: input.variant === 'ordered' ? KEYS.ol : KEYS.ul,
        listStart: input.variant === 'ordered' ? 1 : undefined,
        indent: 1,
        courseListId: createId('list'),
        children: [createEmptyText()],
      };
    case 'spoiler':
      return {
        id: createId('spoiler'),
        type: KEYS.toggle,
        defaultOpen: true,
        children: [
          {
            type: COURSE_SPOILER_TITLE_NODE,
            children: [createEmptyText()],
          },
          createParagraph(),
        ],
      };
    case 'code':
      return {
        id: createId('code'),
        type: KEYS.codeBlock,
        children: [
          {
            type: KEYS.codeLine,
            children: [createEmptyText()],
          },
        ],
      };
    case 'image':
      return {
        id: createId('image'),
        type: COURSE_IMAGE_NODE,
        imageId: input.imageId,
        children: [createEmptyText()],
      };
    case 'files':
      return {
        id: createId('files'),
        type: COURSE_FILES_NODE,
        fileIds: input.fileIds,
        children: [createEmptyText()],
      };
    case 'assignment':
      return {
        id: createId('assignment'),
        type: COURSE_ASSIGNMENT_NODE,
        taskId: input.taskId,
        children: [createEmptyText()],
      };
  }
}

export function createTransformedPlateBlock(
  element: CoursePlateElement,
  input: CreatePlateBlockInput
): CoursePlateElement {
  const inlineChildren = getReusableInlineChildren(element);
  const nextBlock = createEmptyPlateBlock(input);

  switch (input.type) {
    case 'paragraph':
    case 'heading':
    case 'list':
      return {
        ...nextBlock,
        id: element.id ?? nextBlock.id,
        children: inlineChildren,
      };
    case 'quote':
      return {
        ...nextBlock,
        id: element.id ?? nextBlock.id,
        children: [createParagraph(inlineChildren)],
      };
    case 'code':
      return {
        ...nextBlock,
        id: element.id ?? nextBlock.id,
        children: getPlainTextForTransform(element)
          .split('\n')
          .map((line) => ({
            type: KEYS.codeLine,
            children: [{ text: line }],
          })),
      };
    case 'spoiler':
      return {
        ...nextBlock,
        id: element.id ?? nextBlock.id,
        children: [
          {
            type: COURSE_SPOILER_TITLE_NODE,
            children: inlineChildren,
          },
          createParagraph(),
        ],
      };
    case 'image':
    case 'files':
    case 'assignment':
      return {
        ...nextBlock,
        id: element.id ?? nextBlock.id,
      };
  }
}

export function getTopLevelBlockEntries(
  editor: SlateEditor
): CoursePageEditorBlockEntry[] {
  return editor.children.flatMap(
    (node, index): CoursePageEditorBlockEntry[] => {
      if (!isElementNode(node)) {
        return [];
      }

      return [
        {
          element: node,
          id: typeof node.id === 'string' ? node.id : undefined,
          path: [index],
        },
      ];
    }
  );
}

export function getBlockEntryById(editor: SlateEditor, blockId: string) {
  return findBlockEntryByIdInChildren(editor.children, blockId);
}

export function getBlockEntryAtPath(editor: SlateEditor, path: Path) {
  const node = getNodeAtPath(editor.children, path);

  if (!isElementNode(node)) {
    return null;
  }

  return {
    element: node,
    id: typeof node.id === 'string' ? node.id : undefined,
    path,
  } satisfies CoursePageEditorBlockEntry;
}

export function selectBlock(editor: SlateEditor, path: Path) {
  if (!editor.api.hasPath(path)) {
    return false;
  }

  editor.tf.select(path);
  return true;
}

export function insertBlockRelative(
  editor: SlateEditor,
  path: Path,
  placement: 'before' | 'after',
  block: CoursePlateElement
) {
  const nextValue = getEditorValue(editor);
  const parentPath = getParentPath(path);
  const parentChildren = getChildrenAtPath(nextValue, parentPath);

  if (!parentChildren) {
    return false;
  }

  const insertIndex = getPathIndex(path) + (placement === 'after' ? 1 : 0);
  parentChildren.splice(insertIndex, 0, block);
  setEditorValue(editor, nextValue);
  selectPathSoon(editor, [...parentPath, insertIndex]);

  return true;
}

export function insertBlockBelow(
  editor: SlateEditor,
  path: Path,
  block: CoursePlateElement
) {
  return insertBlockRelative(editor, path, 'after', block);
}

export function insertParagraphRelative(
  editor: SlateEditor,
  path: Path,
  placement: 'before' | 'after'
) {
  return insertBlockRelative(editor, path, placement, createParagraph());
}

export function insertParagraphBelow(editor: SlateEditor, path: Path) {
  return insertParagraphRelative(editor, path, 'after');
}

export function duplicateBlock(editor: SlateEditor, path: Path) {
  const block = getBlockEntryAtPath(editor, path)?.element;

  if (!block) {
    return false;
  }

  return insertBlockBelow(editor, path, withNewIds(block));
}

export function removeBlock(editor: SlateEditor, path: Path) {
  const nextValue = getEditorValue(editor);
  const parentPath = getParentPath(path);
  const parentChildren = getChildrenAtPath(nextValue, parentPath);

  if (!parentChildren) {
    return false;
  }

  const removeIndex = getPathIndex(path);

  if (removeIndex < 0 || removeIndex >= parentChildren.length) {
    return false;
  }

  parentChildren.splice(removeIndex, 1);
  const normalizedValue = ensureEditorHasContent(nextValue);
  setEditorValue(editor, normalizedValue);

  const nextIndex = Math.min(removeIndex, parentChildren.length - 1);
  const nextPath = parentChildren.length > 0 ? [...parentPath, nextIndex] : [0];
  selectPathSoon(editor, nextPath);

  return true;
}

export function moveBlock(editor: SlateEditor, path: Path, direction: -1 | 1) {
  const nextValue = getEditorValue(editor);
  const parentPath = getParentPath(path);
  const parentChildren = getChildrenAtPath(nextValue, parentPath);
  const currentIndex = getPathIndex(path);
  const nextIndex = currentIndex + direction;

  if (
    !parentChildren ||
    currentIndex < 0 ||
    nextIndex < 0 ||
    currentIndex >= parentChildren.length ||
    nextIndex >= parentChildren.length
  ) {
    return false;
  }

  const [node] = parentChildren.splice(currentIndex, 1);
  parentChildren.splice(nextIndex, 0, node);
  setEditorValue(editor, nextValue);
  selectPathSoon(editor, [...parentPath, nextIndex]);

  return true;
}

export function moveBlockUp(editor: SlateEditor, path: Path) {
  return moveBlock(editor, path, -1);
}

export function moveBlockDown(editor: SlateEditor, path: Path) {
  return moveBlock(editor, path, 1);
}

export function transformBlock(
  editor: SlateEditor,
  path: Path,
  input: CreatePlateBlockInput
) {
  const block = getBlockEntryAtPath(editor, path)?.element;

  if (!block) {
    return false;
  }

  const nextValue = getEditorValue(editor);
  const parentChildren = getChildrenAtPath(nextValue, getParentPath(path));

  if (!parentChildren) {
    return false;
  }

  parentChildren[getPathIndex(path)] = createTransformedPlateBlock(
    block,
    input
  );
  setEditorValue(editor, nextValue);
  selectPathSoon(editor, path);

  return true;
}

export function insertBlockBelowById(
  editor: SlateEditor,
  blockId: string,
  block: CoursePlateElement
) {
  const entry = getBlockEntryById(editor, blockId);

  return entry ? insertBlockBelow(editor, entry.path, block) : false;
}

export function insertParagraphBelowById(editor: SlateEditor, blockId: string) {
  const entry = getBlockEntryById(editor, blockId);

  return entry ? insertParagraphBelow(editor, entry.path) : false;
}

export function insertParagraphRelativeById(
  editor: SlateEditor,
  blockId: string,
  placement: 'before' | 'after'
) {
  const entry = getBlockEntryById(editor, blockId);

  return entry ? insertParagraphRelative(editor, entry.path, placement) : false;
}

export function duplicateBlockById(editor: SlateEditor, blockId: string) {
  const entry = getBlockEntryById(editor, blockId);

  return entry ? duplicateBlock(editor, entry.path) : false;
}

export function removeBlockById(editor: SlateEditor, blockId: string) {
  const entry = getBlockEntryById(editor, blockId);

  return entry ? removeBlock(editor, entry.path) : false;
}

export function moveBlockUpById(editor: SlateEditor, blockId: string) {
  const entry = getBlockEntryById(editor, blockId);

  return entry ? moveBlockUp(editor, entry.path) : false;
}

export function moveBlockDownById(editor: SlateEditor, blockId: string) {
  const entry = getBlockEntryById(editor, blockId);

  return entry ? moveBlockDown(editor, entry.path) : false;
}

export function transformBlockById(
  editor: SlateEditor,
  blockId: string,
  input: CreatePlateBlockInput
) {
  const entry = getBlockEntryById(editor, blockId);

  return entry ? transformBlock(editor, entry.path, input) : false;
}
