import { KEYS, type Value } from 'platejs';

import {
  normalizeCourseListIndent,
  serializeCourseListIndent,
} from '@/features/course/features/page/model/list-indent';
import { sortRankedContent } from '@/features/course/features/page/model/rank';
import type {
  CourseContentBlockItem,
  CourseListBlock,
  RichTextMark,
  RichTextNode,
} from '@/features/course/features/page/model/types';

export const COURSE_IMAGE_NODE = 'course_image';
export const COURSE_FILES_NODE = 'course_files';
export const COURSE_ASSIGNMENT_NODE = 'course_assignment';
export const COURSE_SPOILER_TITLE_NODE = 'course_spoiler_title';

export type CoursePlateText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type CoursePlateLink = {
  type: typeof KEYS.link;
  url: string;
  linkType?: 'internal' | 'external';
  children: CoursePlateText[];
};

export type CoursePlateInline = CoursePlateText | CoursePlateLink;

export type CoursePlateElement = {
  id?: string;
  type: string;
  children: Array<CoursePlateInline | CoursePlateElement>;
  [key: string]: unknown;
};

function createId(prefix = 'block') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function createRank(index: number) {
  return index.toString(36).padStart(4, '0');
}

function textMarks(node: RichTextNode) {
  return {
    bold: node.marks?.includes('bold') || undefined,
    italic: node.marks?.includes('italic') || undefined,
  };
}

function deserializeRichText(nodes: RichTextNode[]): CoursePlateInline[] {
  if (nodes.length === 0) {
    return [{ text: '' }];
  }

  return nodes.map((node) => {
    if (node.type === 'link') {
      return {
        type: KEYS.link,
        url: node.href,
        linkType: node.linkType,
        children: [{ text: node.text, ...textMarks(node) }],
      };
    }

    return {
      text: node.text,
      ...textMarks(node),
    };
  });
}

function serializeTextMarks(text: CoursePlateText): RichTextMark[] | undefined {
  const marks: RichTextMark[] = [];

  if (text.bold) marks.push('bold');
  if (text.italic) marks.push('italic');

  return marks.length > 0 ? marks : undefined;
}

function isTextNode(
  node: CoursePlateInline | CoursePlateElement
): node is CoursePlateText {
  return 'text' in node && typeof node.text === 'string';
}

function isElementNode(
  node: CoursePlateInline | CoursePlateElement
): node is CoursePlateElement {
  return 'type' in node && 'children' in node;
}

function getTextContent(children: CoursePlateElement['children']): string {
  return children
    .map((child) => {
      if (isTextNode(child)) return child.text;
      if (isElementNode(child)) return getTextContent(child.children);

      return '';
    })
    .join('');
}

function serializeRichText(
  children: CoursePlateElement['children']
): RichTextNode[] {
  return children.flatMap((child): RichTextNode[] => {
    if (isTextNode(child)) {
      return [
        {
          id: createId('text'),
          type: 'text',
          text: child.text,
          marks: serializeTextMarks(child),
        },
      ];
    }

    if (isElementNode(child) && child.type === KEYS.link) {
      const firstText = child.children.find(isTextNode);

      return [
        {
          id: createId('link'),
          type: 'link',
          text: getTextContent(child.children),
          href: typeof child.url === 'string' ? child.url : '',
          linkType: child.linkType === 'internal' ? 'internal' : 'external',
          marks: firstText ? serializeTextMarks(firstText) : undefined,
        },
      ];
    }

    if (isElementNode(child)) {
      return serializeRichText(child.children);
    }

    return [];
  });
}

function deserializeBlock(block: CourseContentBlockItem): CoursePlateElement[] {
  switch (block.type) {
    case 'paragraph':
      return [
        {
          id: block.id,
          type: KEYS.p,
          children: deserializeRichText(block.children),
        },
      ];
    case 'heading':
      return [
        {
          id: block.id,
          type:
            block.level === 1 ? KEYS.h1 : block.level === 2 ? KEYS.h2 : KEYS.h3,
          children: deserializeRichText(block.children),
        },
      ];
    case 'quote':
      return [
        {
          id: block.id,
          type: KEYS.blockquote,
          children: [
            {
              type: KEYS.p,
              children: deserializeRichText(block.children),
            },
          ],
        },
      ];
    case 'list':
      return sortRankedContent(block.items).map((item, itemIndex) => ({
        id: item.id,
        type: KEYS.p,
        listStyleType: block.variant === 'ordered' ? KEYS.ol : KEYS.ul,
        listStart: block.variant === 'ordered' ? itemIndex + 1 : undefined,
        indent: normalizeCourseListIndent(item.indent),
        courseListId: block.id,
        children: deserializeRichText(item.children),
      }));
    case 'spoiler':
      return [
        {
          id: block.id,
          type: KEYS.toggle,
          defaultOpen: block.defaultOpen,
          children: [
            {
              type: COURSE_SPOILER_TITLE_NODE,
              children: deserializeRichText(block.title),
            },
            ...sortRankedContent(block.children).flatMap(deserializeBlock),
          ],
        },
      ];
    case 'code':
      return [
        {
          id: block.id,
          type: KEYS.codeBlock,
          lang: block.language,
          fileName: block.fileName,
          children: block.code.split('\n').map((line) => ({
            type: KEYS.codeLine,
            children: [{ text: line }],
          })),
        },
      ];
    case 'image':
      return [
        {
          id: block.id,
          type: COURSE_IMAGE_NODE,
          imageId: block.imageId,
          children: [{ text: '' }],
        },
      ];
    case 'files':
      return [
        {
          id: block.id,
          type: COURSE_FILES_NODE,
          fileIds: block.fileIds,
          children: [{ text: '' }],
        },
      ];
    case 'assignment':
      return [
        {
          id: block.id,
          type: COURSE_ASSIGNMENT_NODE,
          taskId: block.taskId,
          children: [{ text: '' }],
        },
      ];
  }
}

export function deserializeCourseContentToPlate(
  content: CourseContentBlockItem[]
): Value {
  const value = sortRankedContent(content).flatMap(deserializeBlock);

  return value.length > 0
    ? value
    : [
        {
          id: createId('paragraph'),
          type: KEYS.p,
          children: [{ text: '' }],
        },
      ];
}

function getBlockId(element: CoursePlateElement, index: number) {
  return typeof element.id === 'string' ? element.id : `block-${index}`;
}

function isListElement(element: CoursePlateElement) {
  return element.listStyleType === KEYS.ul || element.listStyleType === KEYS.ol;
}

function serializeCode(
  element: CoursePlateElement,
  index: number
): CourseContentBlockItem {
  return {
    id: getBlockId(element, index),
    rank: createRank(index),
    type: 'code',
    code: element.children
      .map((line) => {
        if (isTextNode(line)) return line.text;
        if (isElementNode(line)) return getTextContent(line.children);

        return '';
      })
      .join('\n'),
    language: typeof element.lang === 'string' ? element.lang : undefined,
    fileName:
      typeof element.fileName === 'string' ? element.fileName : undefined,
  };
}

function serializeStandaloneBlock(
  element: CoursePlateElement,
  index: number
): CourseContentBlockItem | null {
  const base = {
    id: getBlockId(element, index),
    rank: createRank(index),
  };

  switch (element.type) {
    case KEYS.p:
      return {
        ...base,
        type: 'paragraph',
        children: serializeRichText(element.children),
      };
    case KEYS.h1:
    case KEYS.h2:
    case KEYS.h3:
      return {
        ...base,
        type: 'heading',
        level: element.type === KEYS.h1 ? 1 : element.type === KEYS.h2 ? 2 : 3,
        children: serializeRichText(element.children),
      };
    case KEYS.blockquote:
      return {
        ...base,
        type: 'quote',
        children: serializeRichText(element.children),
      };
    case KEYS.codeBlock:
      return serializeCode(element, index);
    case KEYS.toggle: {
      const elementChildren = element.children.filter(isElementNode);
      const titleNode = elementChildren.find(
        (child) => child.type === COURSE_SPOILER_TITLE_NODE
      );
      const bodyChildren = titleNode
        ? elementChildren.filter((child) => child !== titleNode)
        : elementChildren.slice(1);

      return {
        ...base,
        type: 'spoiler',
        title: titleNode ? serializeRichText(titleNode.children) : [],
        children: serializePlateToCourseContent(bodyChildren),
        defaultOpen:
          typeof element.defaultOpen === 'boolean'
            ? element.defaultOpen
            : undefined,
      };
    }
    case COURSE_IMAGE_NODE:
      return typeof element.imageId === 'string'
        ? { ...base, type: 'image', imageId: element.imageId }
        : null;
    case COURSE_FILES_NODE:
      return Array.isArray(element.fileIds)
        ? {
            ...base,
            type: 'files',
            fileIds: element.fileIds.filter(
              (fileId): fileId is string => typeof fileId === 'string'
            ),
          }
        : null;
    case COURSE_ASSIGNMENT_NODE:
      return typeof element.taskId === 'string'
        ? { ...base, type: 'assignment', taskId: element.taskId }
        : null;
    default:
      return {
        ...base,
        type: 'paragraph',
        children: serializeRichText(element.children),
      };
  }
}

export function serializePlateToCourseContent(
  value: Value
): CourseContentBlockItem[] {
  const elements = value.filter(
    (node): node is CoursePlateElement =>
      typeof node === 'object' &&
      node !== null &&
      'type' in node &&
      'children' in node
  );
  const blocks: CourseContentBlockItem[] = [];
  let currentList: CourseListBlock | null = null;

  elements.forEach((element, index) => {
    if (isListElement(element)) {
      const variant =
        element.listStyleType === KEYS.ol ? 'ordered' : 'unordered';

      if (!currentList || currentList.variant !== variant) {
        currentList = {
          id:
            typeof element.courseListId === 'string'
              ? element.courseListId
              : createId('list'),
          rank: createRank(blocks.length),
          type: 'list',
          variant,
          items: [],
        };
        blocks.push(currentList);
      }

      currentList.items.push({
        id: getBlockId(element, index),
        rank: createRank(currentList.items.length),
        children: serializeRichText(element.children),
        indent: serializeCourseListIndent(element.indent),
      });
      return;
    }

    currentList = null;
    const block = serializeStandaloneBlock(element, blocks.length);

    if (block) {
      blocks.push(block);
    }
  });

  return blocks.map((block, index) => ({ ...block, rank: createRank(index) }));
}
