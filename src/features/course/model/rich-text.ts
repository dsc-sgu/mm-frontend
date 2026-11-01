import * as v from 'valibot';
import { isSafeCourseHref } from './links';
import { omitUndefined } from './omit-undefined';

const RichTextMarkSchema = v.picklist(['bold', 'italic', 'code']);

export type RichTextMark = v.InferOutput<typeof RichTextMarkSchema>;

const fields = {
  text: v.string(),
  marks: v.optional(v.array(RichTextMarkSchema)),
};
export const RichTextNodeSchema = v.variant('type', [
  v.object({ type: v.literal('text'), ...fields }),
  v.object({
    type: v.literal('link'),
    ...fields,
    href: v.pipe(v.string(), v.check(isSafeCourseHref)),
  }),
]);

export type RichTextNode = v.InferOutput<typeof RichTextNodeSchema>;

export function normalizeRichText(nodes: RichTextNode[]): RichTextNode[] {
  const result: RichTextNode[] = [];
  for (const node of nodes) {
    const text = node.text.replace(/\r\n?/g, '\n');
    if (!text) {
      continue;
    }
    const marks = (['bold', 'italic', 'code'] as const).filter((mark) =>
      node.marks?.includes(mark)
    );
    const normalized = omitUndefined({
      ...node,
      text,
      marks: marks.length ? marks : undefined,
    });
    const previous = result.at(-1);
    if (
      previous &&
      previous.type === normalized.type &&
      (previous.type !== 'link' ||
        (normalized.type === 'link' && previous.href === normalized.href)) &&
      JSON.stringify(previous.marks) === JSON.stringify(normalized.marks)
    ) {
      previous.text += text;
    } else {
      result.push(normalized);
    }
  }
  return result;
}
