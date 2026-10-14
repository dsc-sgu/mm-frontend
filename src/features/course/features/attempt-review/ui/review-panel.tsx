import { Check, RotateCcw, Save } from 'lucide-react';

import {
  formatGrade,
  type GradeInputError,
} from '@/features/course/model/grade';
import { GradeField } from '@/features/course/ui/grade-field';
import { Button } from '@/shadcn/components/ui/button';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import { formatAttemptReviewDateTime } from '@/features/course/features/attempt-review/model/date-format';
import type { AttemptReviewDraft } from '@/features/course/features/attempt-review/model/draft';
import { RichTextContent, RichTextEditor } from './rich-text/editor';
import type {
  AttemptReviewAggregate,
  AttemptReviewMode,
} from '@/features/course/features/attempt-review/model/types';

type AttemptReviewReviewPanelProps = {
  review: AttemptReviewAggregate;
  draft: AttemptReviewDraft;
  mode: AttemptReviewMode;
  gradeError: GradeInputError | null;
  hasChanges: boolean;
  canSave: boolean;
  savePending: boolean;
  id?: string;
  className?: string;
  onGradeChange: (grade: string) => void;
  onFeedbackChange: (html: string) => void;
  onDiscard: () => void;
  onSave: () => Promise<void>;
};

export function AttemptReviewReviewPanel({
  review,
  draft,
  mode,
  gradeError,
  hasChanges,
  canSave,
  savePending,
  id,
  className,
  onGradeChange,
  onFeedbackChange,
  onDiscard,
  onSave,
}: AttemptReviewReviewPanelProps) {
  return (
    <section
      id={id}
      className={cn(
        'grid gap-0 border-t bg-card lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-4 border-b p-3 sm:p-4 lg:order-2 lg:border-l',
          'lg:min-h-0 lg:overflow-y-auto lg:border-b-0'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Оценка</h2>
          {hasChanges && mode === 'editable' ? (
            <span
              className={cn(
                'rounded-full bg-orange-100 px-2 py-1 text-xs font-medium',
                'text-orange-800 dark:bg-orange-950/40 dark:text-orange-200'
              )}
            >
              Есть изменения
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs text-muted-foreground'
              )}
            >
              <Check className="size-3.5" /> Сохранено
            </span>
          )}
        </div>

        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Оценка за попытку</h3>
          {mode === 'editable' ? (
            <GradeField
              value={draft.grade}
              maxGrade={review.current.task.maxGrade}
              changed={
                draft.grade !==
                (review.current.grade
                  ? formatGrade(review.current.grade.value)
                  : '')
              }
              error={gradeError}
              ariaLabel="Оценка за попытку"
              onChange={onGradeChange}
            />
          ) : (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">Оценка</p>
              <p className="text-2xl font-semibold">
                {review.current.grade
                  ? formatGrade(review.current.grade.value)
                  : '—'}
                /{formatGrade(review.current.task.maxGrade)}
              </p>
            </div>
          )}
        </div>

        {review.current.grade ? (
          <p className="text-sm text-muted-foreground">
            Оценено {formatAttemptReviewDateTime(review.current.grade.gradedAt)}{' '}
            · {review.current.grade.gradedBy}
          </p>
        ) : (
          <p
            className={cn(
              'text-sm font-medium text-orange-600 dark:text-orange-300'
            )}
          >
            Попытка ещё не оценена
          </p>
        )}

        {mode === 'editable' ? (
          <div className="mt-auto grid gap-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="w-full rounded-xl"
                disabled={!canSave}
                onClick={onSave}
              >
                {savePending ? <Spinner /> : <Save className="size-4" />}
                Сохранить
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                disabled={!hasChanges || savePending}
                onClick={onDiscard}
              >
                <RotateCcw className="size-4" />
                Сбросить
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          'flex min-w-0 flex-col gap-3 p-3 sm:p-4',
          'lg:order-1 lg:min-h-0 lg:overflow-hidden'
        )}
      >
        <h2 className="font-semibold">Общий отзыв</h2>
        {mode === 'editable' ? (
          <RichTextEditor
            value={draft.overallFeedbackHtml}
            placeholder="Итоговый отзыв по попытке…"
            className="flex min-h-0 flex-1 flex-col"
            minHeightClassName="min-h-0 flex-1 lg:overflow-y-auto"
            onChange={onFeedbackChange}
          />
        ) : (
          <RichTextContent
            html={review.overallFeedback.html}
            className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
          />
        )}
      </div>
    </section>
  );
}
