// PROTOTYPE (#121): fixed-height virtualized rows. Rows are never measured,
// so anything that tried to grow a row would visibly overlap its neighbour.
import type { ReactNode } from 'react';

import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import type { RowsVirtualizer } from './use-fixed-rows';

export function FixedRowsList({
  attempts,
  rowHeight,
  virtualizer,
  setListRef,
  scrollMargin,
  renderRow,
}: {
  attempts: readonly CourseAttempt[];
  rowHeight: number;
  virtualizer: RowsVirtualizer;
  setListRef: (element: HTMLDivElement | null) => void;
  scrollMargin: number;
  renderRow: (attempt: CourseAttempt) => ReactNode;
}) {
  'use no memo';

  return (
    <div
      ref={setListRef}
      className="relative"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((item) => {
        const attempt = attempts[item.index];

        if (!attempt) {
          return null;
        }

        return (
          <div
            key={item.key}
            data-index={item.index}
            className="absolute top-0 left-0 w-full"
            style={{
              height: `${rowHeight}px`,
              transform: `translateY(${item.start - scrollMargin}px)`,
            }}
          >
            {renderRow(attempt)}
          </div>
        );
      })}
    </div>
  );
}
