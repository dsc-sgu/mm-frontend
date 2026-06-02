import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, RotateCcw, Save } from 'lucide-react';

import { CourseScoreField, scoreDraftMaxScoreError } from '@/course/grading';
import { Button } from '@/shadcn/components/ui/button';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { AttemptReviewDiff } from './attempt-review-diff.component';
import { fileElementId } from './attempt-review.dom';
import { AttemptReviewFileTree } from './attempt-review-file-tree.component';
import {
  AttemptAdjacentControls,
  AttemptReviewHistory,
} from './attempt-review-history.component';
import {
  useAttemptReviewQuery,
  useSaveAttemptReviewMutation,
} from './attempt-review.queries';
import { RichTextContent, RichTextEditor } from './rich-text-editor.component';
import type {
  AttemptReviewAggregate,
  AttemptReviewLineComment,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewPageProps {
  mode: AttemptReviewMode;
  courseSlug: string;
  taskId: string;
  studentUsername: string;
  attemptId: number;
}

interface ReviewDraft {
  score: string;
  overallFeedbackHtml: string;
  lineComments: AttemptReviewLineComment[];
}

export function AttemptReviewPage(props: AttemptReviewPageProps) {
  const reviewQuery = useAttemptReviewQuery(props);

  if (reviewQuery.isLoading) {
    return (
      <main className="mx-auto grid min-h-[60vh] w-full max-w-7xl place-items-center p-6">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Spinner /> Загружаем страницу проверки…
        </div>
      </main>
    );
  }

  if (reviewQuery.isError || !reviewQuery.data) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <section className="rounded-2xl border bg-card p-6">
          <h1 className="text-xl font-semibold">Не удалось открыть попытку</h1>
          <p className="mt-2 text-muted-foreground">
            Проверьте параметры маршрута или попробуйте обновить страницу.
          </p>
        </section>
      </main>
    );
  }

  return (
    <AttemptReviewPageContent
      key={`${props.courseSlug}:${props.taskId}:${props.studentUsername}:${props.attemptId}`}
      {...props}
      review={reviewQuery.data}
    />
  );
}

function AttemptReviewPageContent({
  mode,
  courseSlug,
  taskId,
  studentUsername,
  attemptId,
  review,
}: AttemptReviewPageProps & { review: AttemptReviewAggregate }) {
  const params = { courseSlug, taskId, studentUsername, attemptId };
  const saveMutation = useSaveAttemptReviewMutation();
  const [activeFilePath, setActiveFilePath] = useState<string | null>(
    review.changedFiles[0]?.path ?? null
  );
  const [draft, setDraft] = useState<ReviewDraft>(() => createDraft(review));
  const savedDraft = useMemo(() => createDraft(review), [review]);
  const scoreError = scoreDraftMaxScoreError(
    review.current.task.maxScore,
    draft.score
  );
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const canSave =
    mode === 'editable' && hasChanges && !scoreError && !saveMutation.isPending;
  const totalAdded = review.changedFiles.reduce(
    (sum, file) => sum + file.addedLines,
    0
  );
  const totalDeleted = review.changedFiles.reduce(
    (sum, file) => sum + file.deletedLines,
    0
  );

  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <header className="sticky top-14 z-20 rounded-2xl border bg-background/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="grid gap-3 lg:flex lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {mode === 'editable'
                ? 'Проверка преподавателем'
                : 'Просмотр попытки'}
            </p>
            <h1 className="break-words text-2xl font-semibold tracking-tight">
              Попытка #{review.current.attemptNumber}:{' '}
              {review.current.task.title}
            </h1>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{review.current.student.fullName}</span>
              <span>Максимум: {review.current.task.maxScore}</span>
              <span>
                Отправлено {formatDateTime(review.current.submittedAt)}
              </span>
              <span className="text-emerald-700 dark:text-emerald-300">
                +{totalAdded}
              </span>
              <span className="text-rose-700 dark:text-rose-300">
                −{totalDeleted}
              </span>
              <span>
                {review.baselineAttemptNumber
                  ? `Сравнение с попыткой #${review.baselineAttemptNumber}`
                  : 'Сравнение с пустой базой'}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <AttemptAdjacentControls review={review} mode={mode} />
            {mode === 'editable' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={!hasChanges || saveMutation.isPending}
                  onClick={() => setDraft(savedDraft)}
                >
                  <RotateCcw className="size-4" />
                  Сбросить
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={!canSave}
                  onClick={async () => {
                    const savedReview = await saveMutation.mutateAsync({
                      ...params,
                      score: draft.score ? Number(draft.score) : null,
                      overallFeedbackHtml: draft.overallFeedbackHtml,
                      lineComments: draft.lineComments,
                    });
                    setDraft(createDraft(savedReview));
                  }}
                >
                  {saveMutation.isPending ? (
                    <Spinner />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Сохранить
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside className="grid gap-4 xl:sticky xl:top-40 xl:max-h-[calc(100vh-11rem)] xl:overflow-auto">
          <AttemptReviewFileTree
            files={review.changedFiles}
            activeFilePath={activeFilePath}
            onSelectFile={(path) => {
              setActiveFilePath(path);
              document.getElementById(fileElementId(path))?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
          />
        </aside>

        <AttemptReviewDiff
          files={review.changedFiles}
          comments={draft.lineComments}
          mode={mode}
          activeFilePath={activeFilePath}
          onCommentsChange={(lineComments) => {
            if (mode === 'editable') {
              setDraft((current) =>
                current ? { ...current, lineComments } : current
              );
            }
          }}
        />

        <aside className="grid gap-4 xl:sticky xl:top-40 xl:max-h-[calc(100vh-11rem)] xl:overflow-auto">
          <ReviewPanel
            review={review}
            draft={draft}
            mode={mode}
            scoreError={scoreError}
            hasChanges={hasChanges}
            onDraftChange={setDraft}
          />
        </aside>
      </div>
    </main>
  );
}

function ReviewPanel({
  review,
  draft,
  mode,
  scoreError,
  hasChanges,
  onDraftChange,
}: {
  review: AttemptReviewAggregate;
  draft: ReviewDraft;
  mode: AttemptReviewMode;
  scoreError: string | null;
  hasChanges: boolean;
  onDraftChange: Dispatch<SetStateAction<ReviewDraft>>;
}) {
  return (
    <>
      <section className="grid gap-4 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Оценка и отзыв</h2>
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
            onChange={(score) =>
              onDraftChange((current) =>
                current ? { ...current, score } : current
              )
            }
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

        {review.current.grade ? (
          <p className="text-sm text-muted-foreground">
            Оценено {formatDateTime(review.current.grade.gradedAt)} ·{' '}
            {review.current.grade.gradedBy}
          </p>
        ) : (
          <p className="text-sm font-medium text-orange-600 dark:text-orange-300">
            Попытка ещё не оценена
          </p>
        )}

        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Общий отзыв</h3>
          {mode === 'editable' ? (
            <RichTextEditor
              value={draft.overallFeedbackHtml}
              placeholder="Итоговый отзыв по попытке…"
              onChange={(overallFeedbackHtml) =>
                onDraftChange((current) =>
                  current ? { ...current, overallFeedbackHtml } : current
                )
              }
            />
          ) : (
            <RichTextContent html={review.overallFeedback.html} />
          )}
        </div>
      </section>

      <AttemptReviewHistory review={review} mode={mode} />
    </>
  );
}

function createDraft(review: AttemptReviewAggregate): ReviewDraft {
  return {
    score: review.current.grade ? String(review.current.grade.score) : '',
    overallFeedbackHtml: review.overallFeedback.html,
    lineComments: review.lineComments.map((comment) => ({ ...comment })),
  };
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDateTime(value: string): string {
  return DATE_TIME_FORMAT.format(new Date(value));
}
