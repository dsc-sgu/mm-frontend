import equal from 'fast-deep-equal';
import * as v from 'valibot';
import { isSafeReviewHref } from '@/features/course/model/links';

const LeafSchema = v.strictObject({
  text: v.string(),
  bold: v.optional(v.literal(true)),
  italic: v.optional(v.literal(true)),
  strikethrough: v.optional(v.literal(true)),
  code: v.optional(v.literal(true)),
});
const LinkSchema = v.strictObject({
  type: v.literal('a'),
  url: v.pipe(v.string(), v.check(isSafeReviewHref)),
  children: v.array(LeafSchema),
});
const inline = v.array(v.union([LeafSchema, LinkSchema]));
const BlockSchema = v.variant('type', [
  v.strictObject({ type: v.literal('p'), children: inline }),
  v.strictObject({ type: v.literal('blockquote'), children: inline }),
  v.strictObject({
    type: v.literal('list-item'),
    variant: v.picklist(['ordered', 'unordered']),
    indent: v.pipe(v.number(), v.integer(), v.minValue(0)),
    children: inline,
  }),
  v.strictObject({ type: v.literal('code'), text: v.string() }),
]);
export const ReviewTextDocumentSchema = v.strictObject({
  version: v.literal(1),
  children: v.array(BlockSchema),
});
export type ReviewTextDocument = v.InferOutput<typeof ReviewTextDocumentSchema>;
export function isReviewTextEmpty(
  document: ReviewTextDocument | null
): boolean {
  return !document?.children.some((block) => {
    const text =
      block.type === 'code'
        ? block.text
        : block.children
            .map((node) =>
              'text' in node
                ? node.text
                : node.children.map((leaf) => leaf.text).join('')
            )
            .join('');
    return text.replace(/\s/gu, '').length > 0;
  });
}
export function normalizeReviewText(
  document: ReviewTextDocument
): ReviewTextDocument | null {
  const normalized: ReviewTextDocument = {
    ...document,
    children: document.children.filter(
      (block) =>
        block.type !== 'p' ||
        !isReviewTextEmpty({ version: 1, children: [block] })
    ),
  };
  return isReviewTextEmpty(normalized) ? null : normalized;
}

export const NonemptyReviewTextSchema = v.pipe(
  ReviewTextDocumentSchema,
  v.check(
    (document) =>
      !isReviewTextEmpty(document) &&
      document.children.every(
        (block) =>
          block.type !== 'p' ||
          !isReviewTextEmpty({ version: 1, children: [block] })
      )
  )
);

export function areReviewTextsEqual(
  first: ReviewTextDocument | null | undefined,
  second: ReviewTextDocument | null | undefined
): boolean {
  return equal(first, second);
}
export type ReviewTextLeaf = v.InferOutput<typeof LeafSchema>;
