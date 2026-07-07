import { sortRankedContent } from '@/features/course/features/page/model/rank';
import type {
  CourseContentBlockItem,
  CoursePage,
  CoursePageResources,
  RichTextMark,
  RichTextNode,
} from '@/features/course/features/page/model/types';

export function compareCoursePages(first: CoursePage, second: CoursePage) {
  return (
    JSON.stringify(getComparableCoursePage(first)) !==
    JSON.stringify(getComparableCoursePage(second))
  );
}

function normalizeOptionalText(value: string | undefined) {
  return value && value.length > 0 ? value : undefined;
}

function normalizeMarks(marks: RichTextMark[] | undefined): RichTextMark[] {
  return [...(marks ?? [])].sort();
}

type ComparableRichTextNode =
  | {
      marks: RichTextMark[];
      text: string;
      type: 'text';
    }
  | {
      href: string;
      linkType: 'external' | 'internal';
      marks: RichTextMark[];
      text: string;
      type: 'link';
    };

function areSameTextMarks(
  left: ComparableRichTextNode,
  right: ComparableRichTextNode
) {
  return (
    left.marks.length === right.marks.length &&
    left.marks.every((mark, index) => mark === right.marks[index])
  );
}

function areMergeableRichTextNodes(
  left: ComparableRichTextNode,
  right: ComparableRichTextNode
) {
  if (left.type !== right.type || !areSameTextMarks(left, right)) {
    return false;
  }

  if (left.type === 'text' && right.type === 'text') {
    return true;
  }

  return (
    left.type === 'link' &&
    right.type === 'link' &&
    left.href === right.href &&
    left.linkType === right.linkType
  );
}

function mergeRichTextNodes(
  left: ComparableRichTextNode,
  right: ComparableRichTextNode
): ComparableRichTextNode {
  if (left.type === 'text' && right.type === 'text') {
    return {
      ...left,
      text: `${left.text}${right.text}`,
    };
  }

  if (left.type === 'link' && right.type === 'link') {
    return {
      ...left,
      text: `${left.text}${right.text}`,
    };
  }

  return left;
}

function normalizeRichText(nodes: RichTextNode[]): ComparableRichTextNode[] {
  return nodes.reduce<ComparableRichTextNode[]>((accumulator, node) => {
    if (node.text.length === 0) {
      return accumulator;
    }

    const nextNode: ComparableRichTextNode =
      node.type === 'link'
        ? {
            type: 'link',
            text: node.text,
            href: node.href,
            linkType: node.linkType,
            marks: normalizeMarks(node.marks),
          }
        : {
            type: 'text',
            text: node.text,
            marks: normalizeMarks(node.marks),
          };
    const previousNode = accumulator.at(-1);

    if (previousNode && areMergeableRichTextNodes(previousNode, nextNode)) {
      accumulator[accumulator.length - 1] = mergeRichTextNodes(
        previousNode,
        nextNode
      );
      return accumulator;
    }

    accumulator.push(nextNode);
    return accumulator;
  }, []);
}

function normalizeListIndent(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.round(value))
    : 1;
}

function normalizeContent(blocks: CourseContentBlockItem[]): unknown[] {
  return sortRankedContent(blocks).map((block) => {
    switch (block.type) {
      case 'paragraph':
        return {
          type: 'paragraph',
          children: normalizeRichText(block.children),
        };
      case 'heading':
        return {
          type: 'heading',
          level: block.level,
          children: normalizeRichText(block.children),
        };
      case 'quote':
        return {
          type: 'quote',
          children: normalizeRichText(block.children),
        };
      case 'list':
        return {
          type: 'list',
          variant: block.variant,
          items: sortRankedContent(block.items).map((item) => ({
            children: normalizeRichText(item.children),
            indent: normalizeListIndent(item.indent),
          })),
        };
      case 'spoiler':
        return {
          type: 'spoiler',
          title: normalizeRichText(block.title),
          children: normalizeContent(block.children),
          defaultOpen: block.defaultOpen === true,
        };
      case 'code':
        return {
          type: 'code',
          code: block.code,
          language: normalizeOptionalText(block.language),
          fileName: normalizeOptionalText(block.fileName),
        };
      case 'image':
        return {
          type: 'image',
          imageId: block.imageId,
        };
      case 'files':
        return {
          type: 'files',
          fileIds: block.fileIds,
        };
      case 'assignment':
        return {
          type: 'assignment',
          taskId: block.taskId,
        };
    }
  });
}

function normalizeResources(resources: CoursePageResources) {
  return {
    images: [...resources.images]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((image) => ({
        id: image.id,
        src: image.src,
        alt: image.alt,
        caption: image.caption ? normalizeRichText(image.caption) : [],
      })),
    files: [...resources.files]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((file) => ({
        id: file.id,
        name: file.name,
        href: file.href,
        size: normalizeOptionalText(file.size),
        mimeType: normalizeOptionalText(file.mimeType),
      })),
    assignments: [...resources.assignments]
      .sort((a, b) => a.taskId.localeCompare(b.taskId))
      .map((assignment) => ({
        taskId: assignment.taskId,
        title: assignment.title,
        description: assignment.description
          ? normalizeRichText(assignment.description)
          : [],
        dueDate: normalizeOptionalText(assignment.dueDate),
        maxScore: assignment.maxScore,
      })),
  };
}

function getComparableCoursePage(course: CoursePage) {
  return {
    courseId: course.courseId,
    title: course.title,
    description: course.description,
    color: course.color,
    iconName: course.iconName,
    content: normalizeContent(course.content),
    resources: normalizeResources(course.resources),
  };
}
