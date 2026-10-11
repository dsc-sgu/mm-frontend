// PROTOTYPE (#121): fixed-height virtualized rows in one container with row
// dividers (#45). Rows are never measured, so anything that tried to grow a
// row would visibly overlap its neighbour.
import type { ReactNode } from 'react';

import { cn } from '@/shadcn/lib/utils';

import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import { desktopColumns, type FeedbackColumn } from './columns';
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
    <div className="overflow-hidden rounded-2xl border bg-card">
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
              className={cn(
                'absolute top-0 left-0 w-full',
                item.index > 0 ? 'border-t border-border/70' : null
              )}
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
    </div>
  );
}

export function ListHeader({
  feedbackColumn,
}: {
  feedbackColumn: FeedbackColumn;
}) {
  const zones = [
    'Задание',
    'Отправлено',
    'Состояние',
    'Балл',
    ...(feedbackColumn === 'field' ? ['Общий отзыв'] : []),
  ];

  return (
    <div
      className={cn(
        'mb-1.5 grid px-4 text-xs font-medium text-muted-foreground',
        desktopColumns[feedbackColumn]
      )}
    >
      <span>Студент</span>
      {zones.map((zone) => (
        <span key={zone} className="truncate px-3">
          {zone}
        </span>
      ))}
    </div>
  );
}
