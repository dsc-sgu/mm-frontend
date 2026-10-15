// PROTOTYPE (#181): the statement stays a Markdown string in the store, while
// the Course Page editor edits Course Content blocks. This bridges the two
// through the same Plate value shapes the Course Page already uses.
import { MarkdownPlugin } from '@platejs/markdown';
import { createPlateEditor } from 'platejs/react';

import type { CourseContentBlockItem } from '@/features/course/features/page/model/types';
import {
  deserializeCourseContentToPlate,
  serializePlateToCourseContent,
} from '@/features/course/features/page-edit/model/plate-content';
import {
  markdownToValue,
  statementPlugins,
} from '@/features/course/prototype/task-and-deadline-settings/panel/statement/plugins';

let converter: ReturnType<typeof createConverter> | undefined;

function createConverter() {
  return createPlateEditor({ plugins: statementPlugins });
}

function getConverter() {
  converter ??= createConverter();
  return converter;
}

export function markdownToCourseContent(
  markdown: string
): CourseContentBlockItem[] {
  return serializePlateToCourseContent(
    markdownToValue(getConverter(), markdown)
  );
}

/**
 * Markdown has no spoiler, image, file or Task Reference. A spoiler keeps its
 * text as a title paragraph plus its blocks; the rest, like empty
 * paragraphs, is dropped. The README lists this among the simplifications.
 */
function markdownBlocks(
  content: CourseContentBlockItem[]
): CourseContentBlockItem[] {
  return content.flatMap((block): CourseContentBlockItem[] => {
    switch (block.type) {
      case 'spoiler':
        return [
          { ...block, type: 'paragraph', children: block.title },
          ...markdownBlocks(block.children),
        ];
      case 'image':
      case 'files':
      case 'assignment':
        return [];
      case 'paragraph':
        // An empty paragraph would become an invisible character.
        return block.children.some((node) => node.text !== '') ? [block] : [];
      default:
        return [block];
    }
  });
}

export function courseContentToMarkdown(
  content: CourseContentBlockItem[]
): string {
  const editor = getConverter();
  const value = deserializeCourseContentToPlate(markdownBlocks(content));

  return editor.getApi(MarkdownPlugin).markdown.serialize({ value }).trimEnd();
}
