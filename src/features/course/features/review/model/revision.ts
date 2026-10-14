import * as v from 'valibot';

/** The number of a published Review Revision; the first one is 1. */
export const ReviewRevisionSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.brand('ReviewRevision')
);

export type ReviewRevision = v.InferOutput<typeof ReviewRevisionSchema>;
