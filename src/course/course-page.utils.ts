import type { RankedContent } from './course-page.types';

export function sortByRank<T extends RankedContent>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const rankOrder = a.rank.localeCompare(b.rank);

    if (rankOrder !== 0) {
      return rankOrder;
    }

    return a.id.localeCompare(b.id);
  });
}
