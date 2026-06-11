import { Check, RotateCcw, Save } from 'lucide-react';

import { CourseScoreField } from '@/course/grading';
import { Button } from '@/shadcn/components/ui/button';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import { formatAttemptReviewDateTime } from './attempt-review-date.format';
import type { AttemptReviewDraft } from './attempt-review-draft.hook';
import { RichTextContent, RichTextEditor } from './rich-text-editor.component';
import type {
  AttemptReviewAggregate,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewReviewPanelProps {
  review: AttemptReviewAggregate;
  draft: AttemptReviewDraft;
  mode: AttemptReviewMode;
  scoreError: string | null;
  hasChanges: boolean;
  hasCommentChanges: boolean;
  canSave: boolean;
  savePending: boolean;
  className?: string;
  onScoreChange: (score: string) => void;
  onFeedbackChange: (html: string) => void;
  onDiscard: () => void;
  onSave: () => Promise<void>;
}

export function AttemptReviewReviewPanel({
  review,
  draft,
  mode,
  scoreError,
  hasChanges,
  hasCommentChanges,
  canSave,
  savePending,
  className,
  onScoreChange,
  onFeedbackChange,
  onDiscard,
  onSave,
}: AttemptReviewReviewPanelProps) {
  return (
    <section
      className={cn(
        '-mx-3 grid gap-0 border-y bg-card sm:-mx-6 lg:-mx-8 xl:grid-cols-[20rem_minmax(0,1fr)]',
        className
      )}
    >
      <div className="grid content-start gap-4 border-b p-3 sm:p-4 xl:border-r xl:border-b-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Оценка</h2>
          {hasChanges && mode === 'editable' ? (
            <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
              Есть изменения
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3.5" /> Сохранено
            </span>
          )}
        </div>

        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Балл</h3>
          {mode === 'editable' ? (
            <CourseScoreField
              value={draft.score}
              maxScore={review.current.task.maxScore}
              changed={
                draft.score !==
                (review.current.grade ? String(review.current.grade.score) : '')
              }
              error={scoreError}
              ariaLabel="Балл за попытку"
              onChange={onScoreChange}
            />
          ) : (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">Балл</p>
              <p className="text-2xl font-semibold">
                {review.current.grade
                  ? `${review.current.grade.score}/${review.current.grade.maxScore}`
                  : `—/${review.current.task.maxScore}`}
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
          <p className="text-sm font-medium text-orange-600 dark:text-orange-300">
            Попытка ещё не оценена
          </p>
        )}

        {mode === 'editable' ? (
          <div className="grid gap-3 border-t pt-4">
            {hasCommentChanges ? (
              <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                Есть несохранённые изменения в комментариях.
              </p>
            ) : null}
            <div className="flex flex-wrap justify-start gap-2">
              <Button
                type="button"
                className="rounded-xl"
                disabled={!canSave}
                onClick={onSave}
              >
                {savePending ? <Spinner /> : <Save className="size-4" />}
                Сохранить
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
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

      <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
        <h2 className="font-semibold">Общий отзыв</h2>
        {mode === 'editable' ? (
          <RichTextEditor
            value={draft.overallFeedbackHtml}
            placeholder="Итоговый отзыв по попытке…"
            className="flex min-h-0 flex-1 flex-col"
            minHeightClassName="min-h-0 flex-1"
            onChange={onFeedbackChange}
          />
        ) : (
          <RichTextContent html={review.overallFeedback.html} />
        )}
      </div>
    </section>
  );
}
