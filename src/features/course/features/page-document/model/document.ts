import { omitUndefined } from '@/features/course/model/omit-undefined';
import * as v from 'valibot';
import {
  RichTextNodeSchema,
  normalizeRichText,
} from '@/features/course/model/rich-text';
import { clampCourseListIndent } from './list-indent';

const richText = v.array(RichTextNodeSchema);
const block = <
  T extends string,
  S extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(
  type: T,
  data: S
) =>
  v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    type: v.literal(type),
    data: v.intersect([data, v.object({ formatVersion: v.literal(1) })]),
  });
const paragraph = block('paragraph', v.object({ children: richText }));
const heading = block(
  'heading',
  v.object({
    level: v.union([v.literal(1), v.literal(2), v.literal(3)]),
    children: richText,
  })
);
const quote = block('quote', v.object({ children: richText }));
const listItem = block(
  'list-item',
  v.object({
    children: richText,
    variant: v.picklist(['ordered', 'unordered']),
    indent: v.optional(v.unknown()),
  })
);
const code = block(
  'code',
  v.object({
    code: v.string(),
    language: v.optional(v.string()),
    fileName: v.optional(v.string()),
  })
);
const image = block(
  'image',
  v.object({
    imageId: v.string(),
    alt: v.optional(v.string()),
    caption: v.optional(richText),
  })
);
const files = block('files', v.object({ fileIds: v.array(v.string()) }));
const body = v.variant('type', [
  paragraph,
  heading,
  quote,
  listItem,
  code,
  image,
  files,
]);
export const BlockSchema = v.variant('type', [
  paragraph,
  heading,
  quote,
  listItem,
  code,
  image,
  files,
  block('assignment', v.object({ taskId: v.string() })),
  block(
    'spoiler',
    v.object({
      title: richText,
      children: v.array(body),
      defaultOpen: v.optional(v.boolean()),
    })
  ),
]);
export type DocumentBlock = v.InferOutput<typeof BlockSchema>;
export type UnsupportedBlock = { id: string; type: 'unsupported' };
export type ReadBlock = DocumentBlock | UnsupportedBlock;

function normalizeBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  let previousIndent: number | null = null;
  return blocks.map((item): DocumentBlock => {
    if (item.type === 'list-item') {
      const indent = clampCourseListIndent(item.data.indent, previousIndent);
      previousIndent = indent;
      return {
        ...item,
        data: {
          ...item.data,
          children: normalizeRichText(item.data.children),
          indent,
        },
      };
    }
    previousIndent = null;
    switch (item.type) {
      case 'paragraph':
        return {
          ...item,
          data: {
            ...item.data,
            children: normalizeRichText(item.data.children),
          },
        };
      case 'heading':
        return {
          ...item,
          data: {
            ...item.data,
            children: normalizeRichText(item.data.children),
          },
        };
      case 'quote':
        return {
          ...item,
          data: {
            ...item.data,
            children: normalizeRichText(item.data.children),
          },
        };
      case 'spoiler':
        return {
          ...item,
          data: omitUndefined({
            ...item.data,
            title: normalizeRichText(item.data.title),
            children: normalizeBlocks(
              item.data.children
            ) as typeof item.data.children,
          }),
        };
      case 'image':
        return {
          ...item,
          data: omitUndefined({
            ...item.data,
            caption: item.data.caption && normalizeRichText(item.data.caption),
          }),
        };
      case 'code':
        return {
          ...item,
          data: omitUndefined({
            ...item.data,
            code: item.data.code.replace(/\r\n?/g, '\n'),
          }),
        };
      default:
        return item;
    }
  });
}

export function readDocument(input: readonly unknown[]): ReadBlock[] {
  const ids = new Set<string>();
  const parsed = input.map((value, index): ReadBlock => {
    const result = v.safeParse(BlockSchema, value);
    if (result.success && !ids.has(result.output.id)) {
      ids.add(result.output.id);
      return result.output;
    }
    const id =
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'string'
        ? value.id
        : `unsupported-${index}`;
    return { id, type: 'unsupported' };
  });
  // Invalid blocks also interrupt list runs.
  const result: ReadBlock[] = [];
  let run: DocumentBlock[] = [];
  for (const item of parsed) {
    if (item.type === 'unsupported') {
      result.push(...normalizeBlocks(run), item);
      run = [];
    } else run.push(item);
  }
  return [...result, ...normalizeBlocks(run)];
}

export function editDocument(
  input: readonly unknown[]
):
  | { status: 'supported'; blocks: DocumentBlock[] }
  | { status: 'unsupported-content' } {
  const parsed = readDocument(input);
  if (parsed.some((item) => item.type === 'unsupported'))
    return { status: 'unsupported-content' };
  return {
    status: 'supported',
    blocks: normalizeBlocks(parsed as DocumentBlock[]),
  };
}
