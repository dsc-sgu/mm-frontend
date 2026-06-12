import type { RankedContent } from './types';

export function sortRankedContent<T extends RankedContent>(
  items: readonly T[]
) {
  return [...items].sort((a, b) => {
    const rankOrder = a.rank.localeCompare(b.rank);

    if (rankOrder !== 0) {
      return rankOrder;
    }

    return a.id.localeCompare(b.id);
  });
}
