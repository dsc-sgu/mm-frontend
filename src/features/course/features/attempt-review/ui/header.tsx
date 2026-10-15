import { MessageSquareText, PanelLeftOpen } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { AttemptReviewAttemptSelect } from './attempt-select';
import { formatAttemptReviewDateTime } from '@/features/course/features/attempt-review/model/date-format';
import { formatGrade } from '@/features/course/model/grade';
import { AttemptReviewDiffViewToggle } from './diff-view-toggle';
import type {
  AttemptMaterial,
  AttemptReviewDiffViewMode,
  AttemptReviewMode,
  AttemptSummary,
  StudentAttempt,
} from '@/features/course/features/attempt-review/model/types';
import { cn } from '@/shadcn/lib/utils';

type AttemptReviewHeaderProps = {
  mode: AttemptReviewMode;
  summary: AttemptSummary;
  material: AttemptMaterial;
  attempts: StudentAttempt[];
  currentAttempt: StudentAttempt;
  diffViewMode: AttemptReviewDiffViewMode;
  hasChanges: boolean;
  totalAdded: number;
  totalDeleted: number;
  onDiffViewModeChange: (value: AttemptReviewDiffViewMode) => void;
  onOpenFileTree: () => void;
  onOpenReviewPanel: () => void;
};

export function AttemptReviewHeader({
  mode,
  summary,
  material,
  attempts,
  currentAttempt,
  diffViewMode,
  hasChanges,
  totalAdded,
  totalDeleted,
  onDiffViewModeChange,
  onOpenFileTree,
  onOpenReviewPanel,
}: AttemptReviewHeaderProps) {
  return (
    <header
      className={cn(
        'z-30 -mx-3 shrink-0 overflow-hidden border-b bg-background/95',
        'px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-4'
      )}
    >
      <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1
            className={cn(
              'text-lg leading-6 font-semibold tracking-tight break-words'
            )}
          >
            Попытка #{summary.attemptNumber}: {summary.task.title}
          </h1>
          <p
            className={cn(
              'mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-xs leading-4',
              'text-muted-foreground'
            )}
          >
            <span>{summary.student.name}</span>
            <span>Максимум: {formatGrade(summary.task.maxGrade)}</span>
            <span>
              Отправлено {formatAttemptReviewDateTime(summary.submittedAt)}
            </span>
            <span>
              Дедлайн {formatAttemptReviewDateTime(summary.deadlineAt)}
            </span>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-2 whitespace-nowrap'
              )}
            >
              <span className="text-emerald-700 dark:text-emerald-300">
                +{totalAdded}
              </span>
              <span className="text-rose-700 dark:text-rose-300">
                −{totalDeleted}
              </span>
            </span>
            <span>
              {material.baselineAttemptNumber
                ? `Сравнение с попыткой #${material.baselineAttemptNumber}`
                : 'Сравнение с пустой базой'}
            </span>
          </p>
        </div>

        <div
          className={cn(
            'grid w-full min-w-0 gap-2 lg:flex lg:w-auto lg:shrink-0',
            'lg:items-center'
          )}
        >
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
                  className={cn(
                    'absolute top-2 right-2 size-2 rounded-full bg-amber-500'
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </Button>
          </div>
          <div
            className={cn(
              'flex min-w-0 gap-2 lg:w-auto lg:shrink-0 lg:items-center'
            )}
          >
            <AttemptReviewDiffViewToggle
              value={diffViewMode}
              onChange={onDiffViewModeChange}
            />
            <AttemptReviewAttemptSelect
              attempts={attempts}
              current={currentAttempt}
              maxGrade={summary.task.maxGrade}
              mode={mode}
              variant="header"
              className="min-w-0 flex-1 lg:w-[21rem] lg:flex-none lg:shrink-0"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
