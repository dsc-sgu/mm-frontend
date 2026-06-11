import { forwardRef } from 'react';
import { MessageSquareText, PanelLeftOpen } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { AttemptReviewAttemptSelect } from './attempt-review-attempt-select.component';
import { formatAttemptReviewDateTime } from './model/date-format';
import { AttemptReviewDiffViewToggle } from './attempt-review-diff-view-toggle.component';
import type {
  AttemptReviewAggregate,
  AttemptReviewDiffViewMode,
  AttemptReviewMode,
} from './model/types';

type AttemptReviewHeaderProps = {
  mode: AttemptReviewMode;
  review: AttemptReviewAggregate;
  diffViewMode: AttemptReviewDiffViewMode;
  hasChanges: boolean;
  totalAdded: number;
  totalDeleted: number;
  onDiffViewModeChange: (value: AttemptReviewDiffViewMode) => void;
  onOpenFileTree: () => void;
  onOpenReviewPanel: () => void;
};

export const AttemptReviewHeader = forwardRef<
  HTMLElement,
  AttemptReviewHeaderProps
>(function AttemptReviewHeader(
  {
    mode,
    review,
    diffViewMode,
    hasChanges,
    totalAdded,
    totalDeleted,
    onDiffViewModeChange,
    onOpenFileTree,
    onOpenReviewPanel,
  },
  ref
) {
  return (
    <header
      ref={ref}
      className="-mx-3 sticky top-0 z-30 overflow-hidden border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-4"
    >
      <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-lg leading-6 font-semibold tracking-tight">
            Попытка #{review.current.attemptNumber}: {review.current.task.title}
          </h1>
          <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-xs leading-4 text-muted-foreground">
            <span>{review.current.student.fullName}</span>
            <span>Максимум: {review.current.task.maxScore}</span>
            <span>
              Отправлено{' '}
              {formatAttemptReviewDateTime(review.current.submittedAt)}
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
              <span className="text-emerald-700 dark:text-emerald-300">
                +{totalAdded}
              </span>
              <span className="text-rose-700 dark:text-rose-300">
                −{totalDeleted}
              </span>
            </span>
            <span>
              {review.baselineAttemptNumber
                ? `Сравнение с попыткой #${review.baselineAttemptNumber}`
                : 'Сравнение с пустой базой'}
            </span>
          </p>
        </div>

        <div className="grid w-full min-w-0 gap-2 lg:flex lg:w-auto lg:items-center lg:shrink-0">
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-9 justify-start px-2.5 min-[480px]:px-3"
              onClick={onOpenFileTree}
            >
              <PanelLeftOpen className="size-4" />
              Файлы
            </Button>
            <Button
              type="button"
              variant="outline"
              className="relative h-9 justify-start px-2.5 min-[480px]:px-3"
              onClick={onOpenReviewPanel}
            >
              <MessageSquareText className="size-4" />
              Отзыв
              {hasChanges ? (
                <span
                  className="absolute top-2 right-2 size-2 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
              ) : null}
            </Button>
          </div>
          <div className="flex min-w-0 gap-2 lg:w-auto lg:items-center lg:shrink-0">
            <AttemptReviewDiffViewToggle
              value={diffViewMode}
              onChange={onDiffViewModeChange}
            />
            <AttemptReviewAttemptSelect
              review={review}
              mode={mode}
              variant="header"
              className="min-w-0 flex-1 lg:w-[21rem] lg:flex-none lg:shrink-0"
            />
          </div>
        </div>
      </div>
    </header>
  );
});
