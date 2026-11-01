import { KEYS, type Value } from 'platejs';

import { serializeCourseListIndent } from '@/features/course/features/page-document/model/list-indent';
import {
  editDocument,
  type DocumentBlock,
} from '@/features/course/features/page-document/model/document';
import { buildListTree } from '@/features/course/features/page-document/model/lists';
import type {
  CourseContentBlockItem,
  CourseHeadingBlock,
  RichTextMark,
  RichTextNode,
} from '@/features/course/features/page/model/types';

export const COURSE_IMAGE_NODE = 'course_image';
export const COURSE_FILES_NODE = 'course_files';
export const COURSE_ASSIGNMENT_NODE = 'course_assignment';
export const COURSE_SPOILER_TITLE_NODE = 'course_spoiler_title';

type HeadingLevel = CourseHeadingBlock['level'];

export const COURSE_HEADING_NODES: Record<HeadingLevel, string> = {
  1: KEYS.h1,
  2: KEYS.h2,
  3: KEYS.h3,
};

function headingLevel(type: string): HeadingLevel {
  switch (type) {
    case KEYS.h1:
      return 1;
    case KEYS.h2:
      return 2;
    default:
      return 3;
  }
}

export type CoursePlateText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

export type CoursePlateLink = {
  type: typeof KEYS.link;
  url: string;
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

function textMarks(node: RichTextNode) {
  return {
    bold: node.marks?.includes('bold') || undefined,
    italic: node.marks?.includes('italic') || undefined,
    code: node.marks?.includes('code') || undefined,
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

  if (text.bold) {
    marks.push('bold');
  }
  if (text.italic) {
    marks.push('italic');
  }
  if (text.code) {
    marks.push('code');
  }

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
      if (isTextNode(child)) {
        return child.text;
      }
      if (isElementNode(child)) {
        return getTextContent(child.children);
      }

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
          type: 'link',
          text: getTextContent(child.children),
          href: typeof child.url === 'string' ? child.url : '',
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

function deserializeBlock(item: CourseContentBlockItem): CoursePlateElement[] {
  const block = { ...item.data, id: item.id, type: item.type } as FlatBlock;
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
          type: COURSE_HEADING_NODES[block.level],
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
    case 'list-item':
      return [
        {
          id: block.id,
          type: KEYS.p,
          listStyleType: block.variant === 'ordered' ? KEYS.ol : KEYS.ul,
          indent: block.indent,
          children: deserializeRichText(block.children),
        },
      ];
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
            ...deserializeCourseContentToPlate(block.children),
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
          alt: block.alt,
          caption: block.caption,
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
  const result = editDocument(content);
  if (result.status === 'unsupported-content') {
    throw new UnsupportedContentError();
  }
  const starts = new Map<string, number>();
  function collect(items: ReturnType<typeof buildListTree>) {
    for (const item of items) {
      starts.set(item.block.id, item.number);
      collect(item.nestedItems);
    }
  }
  let run: Extract<DocumentBlock, { type: 'list-item' }>[] = [];
  for (const block of [...result.blocks, null]) {
    if (block?.type === 'list-item') {
      run.push(block);
    } else {
      collect(buildListTree(run));
      run = [];
    }
  }
  const value = result.blocks
    .flatMap(deserializeBlock)
    .map((node) =>
      node.listStyleType === KEYS.ol
        ? { ...node, listStart: starts.get(node.id!) }
        : node
    );

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

function serializeCode(element: CoursePlateElement, index: number): FlatBlock {
  return {
    id: getBlockId(element, index),
    type: 'code',
    code: element.children
      .map((line) => {
        if (isTextNode(line)) {
          return line.text;
        }
        if (isElementNode(line)) {
          return getTextContent(line.children);
        }

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
): FlatBlock | null {
  const base = {
    id: getBlockId(element, index),
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
        level: headingLevel(element.type),
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
        children: serializeSpoilerBody(bodyChildren),
        defaultOpen:
          typeof element.defaultOpen === 'boolean'
            ? element.defaultOpen
            : undefined,
      };
    }
    case COURSE_IMAGE_NODE:
      return typeof element.imageId === 'string'
        ? {
            ...base,
            type: 'image',
            imageId: element.imageId,
            alt: typeof element.alt === 'string' ? element.alt : undefined,
            caption: Array.isArray(element.caption)
              ? (element.caption as RichTextNode[])
              : undefined,
          }
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
      throw new UnsupportedContentError();
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
  const blocks: DocumentBlock[] = [];
  for (const [index, element] of elements.entries()) {
    const flat: FlatBlock | null = isListElement(element)
      ? {
          id: getBlockId(element, index),
          type: 'list-item',
          children: serializeRichText(element.children),
          indent: serializeCourseListIndent(element.indent),
          variant: element.listStyleType === KEYS.ol ? 'ordered' : 'unordered',
        }
      : serializeStandaloneBlock(element, index);
    if (!flat) {
      throw new UnsupportedContentError();
    }
    const { id, type, ...data } = flat;
    blocks.push({
      id,
      type,
      data: { ...data, formatVersion: 1 },
    } as DocumentBlock);
  }
  const result = editDocument(blocks);
  if (result.status === 'unsupported-content') {
    throw new UnsupportedContentError();
  }
  return result.blocks;
}

type Flatten<T> = T extends { id: string; type: string; data: object }
  ? { id: T['id']; type: T['type'] } & Omit<T['data'], 'formatVersion'>
  : never;
type FlatBlock = Flatten<DocumentBlock>;
export class UnsupportedContentError extends Error {
  readonly kind = 'unsupported-content';
  constructor() {
    super('Содержимое не поддерживается. Обновите приложение.');
  }
}

function serializeSpoilerBody(value: Value) {
  const blocks = serializePlateToCourseContent(value);
  if (
    blocks.some(
      (block) => block.type === 'spoiler' || block.type === 'assignment'
    )
  ) {
    throw new UnsupportedContentError();
  }
  return blocks.filter(
    (block) => block.type !== 'spoiler' && block.type !== 'assignment'
  );
}
