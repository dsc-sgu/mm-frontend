import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Check,
  ChevronsUpDown,
  MessageSquare,
  PanelLeftOpen,
  RotateCcw,
  Save,
  SquareSplitHorizontal,
  SquareSplitVertical,
  X,
} from 'lucide-react';

import { CourseScoreField, scoreDraftMaxScoreError } from '@/course/grading';
import { Button } from '@/shadcn/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shadcn/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/use-media-query.hook';
import { AttemptReviewDiff } from './attempt-review-diff.component';
import { fileElementId } from './attempt-review.dom';
import { AttemptReviewFileTree } from './attempt-review-file-tree.component';
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

type DiffViewMode = 'unified' | 'split';

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
  const [isSummaryCompact, setIsSummaryCompact] = useState(false);
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);
  const [isFileTreeDrawerOpen, setIsFileTreeDrawerOpen] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>('split');
  const pageHeaderRef = useRef<HTMLElement | null>(null);
  const pageRootRef = useRef<HTMLElement | null>(null);
  const isDesktopReviewLayout = useMediaQuery('(min-width: 1024px)');
  const savedDraft = useMemo(() => createDraft(review), [review]);

  const updateStickyOffset = useCallback(() => {
    const header = pageHeaderRef.current;
    const pageRoot = pageRootRef.current;

    if (!header || !pageRoot) {
      return;
    }

    pageRoot.style.setProperty(
      '--attempt-review-sticky-top',
      `${Math.ceil(header.getBoundingClientRect().height)}px`
    );
  }, []);

  useLayoutEffect(() => {
    const header = pageHeaderRef.current;

    if (!header) {
      return;
    }

    updateStickyOffset();

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateStickyOffset);

    resizeObserver?.observe(header, { box: 'border-box' });
    header.addEventListener('transitionend', updateStickyOffset);
    window.addEventListener('resize', updateStickyOffset);

    return () => {
      resizeObserver?.disconnect();
      header.removeEventListener('transitionend', updateStickyOffset);
      window.removeEventListener('resize', updateStickyOffset);
    };
  }, [updateStickyOffset]);

  useLayoutEffect(() => {
    updateStickyOffset();

    const animationFrame = window.requestAnimationFrame(updateStickyOffset);
    const transitionTimeout = window.setTimeout(updateStickyOffset, 240);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(transitionTimeout);
    };
  }, [isDesktopReviewLayout, isSummaryCompact, updateStickyOffset]);

  useEffect(() => {
    let animationFrame: number | null = null;

    const updateCompactState = () => {
      animationFrame = null;
      setIsSummaryCompact(window.scrollY > 48);
    };

    const scheduleUpdate = () => {
      if (animationFrame !== null) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateCompactState);
    };

    updateCompactState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);
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

  function scrollToFile(path: string) {
    document.getElementById(fileElementId(path))?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function handleSelectFile(path: string) {
    setActiveFilePath(path);

    if (isDesktopReviewLayout) {
      scrollToFile(path);
      return;
    }

    setIsFileTreeDrawerOpen(false);
    window.requestAnimationFrame(() => scrollToFile(path));
  }

  return (
    <main
      ref={pageRootRef}
      className="flex w-full flex-col gap-0 px-3 pt-0 pb-0 sm:px-6 sm:pt-0 sm:pb-0 lg:px-8"
    >
      <header
        ref={pageHeaderRef}
        className={cn(
          '-mx-3 sticky top-0 z-30 overflow-hidden border-b bg-background/95 px-3 backdrop-blur transition-all duration-200 supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-4',
          isSummaryCompact ? 'py-2' : 'py-4'
        )}
      >
        <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p
              className={cn(
                'overflow-hidden text-sm font-medium text-muted-foreground transition-all duration-200',
                isSummaryCompact
                  ? 'max-h-0 -translate-y-1 opacity-0'
                  : 'max-h-5 translate-y-0 opacity-100'
              )}
            >
              {mode === 'editable'
                ? 'Проверка преподавателем'
                : 'Просмотр попытки'}
            </p>
            <h1
              className={cn(
                'break-words font-semibold tracking-tight transition-all duration-200',
                isSummaryCompact ? 'text-lg leading-6' : 'text-2xl leading-8'
              )}
            >
              Попытка #{review.current.attemptNumber}:{' '}
              {review.current.task.title}
            </h1>
            <p
              className={cn(
                'flex flex-wrap text-muted-foreground transition-all duration-200',
                isSummaryCompact
                  ? 'mt-0.5 gap-x-2 gap-y-0 text-xs leading-4'
                  : 'mt-1 gap-x-3 gap-y-1 text-sm leading-5'
              )}
            >
              <span>{review.current.student.fullName}</span>
              <span>Максимум: {review.current.task.maxScore}</span>
              <span>
                Отправлено {formatDateTime(review.current.submittedAt)}
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

          <div className="flex w-full min-w-0 gap-2 lg:w-auto lg:items-center lg:shrink-0">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-2.5 min-[480px]:px-3 lg:hidden"
              onClick={() => setIsFileTreeDrawerOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
              <span className="hidden min-[480px]:inline">Файлы</span>
            </Button>
            <DiffViewToggle value={diffViewMode} onChange={setDiffViewMode} />
            <AttemptSelect
              review={review}
              mode={mode}
              variant="header"
              className="min-w-0 flex-1 lg:w-[21rem] lg:flex-none lg:shrink-0"
            />
          </div>
        </div>
      </header>

      <Drawer
        direction="left"
        open={isFileTreeDrawerOpen && !isDesktopReviewLayout}
        onOpenChange={setIsFileTreeDrawerOpen}
      >
        <DrawerContent className="!inset-0 !h-dvh !max-h-none !w-screen !max-w-none !rounded-none !border-0">
          <div className="flex h-full min-h-0 flex-col bg-card">
            <DrawerHeader className="flex-row items-start justify-between gap-4 border-b text-left">
              <div className="min-w-0">
                <DrawerTitle>Изменённые файлы</DrawerTitle>
                <DrawerDescription>
                  Выберите файл, чтобы перейти к его diff.
                </DrawerDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Закрыть список файлов"
                onClick={() => setIsFileTreeDrawerOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </DrawerHeader>
            <div className="min-h-0 flex-1">
              <AttemptReviewFileTree
                files={review.changedFiles}
                activeFilePath={activeFilePath}
                className="h-full border-0"
                onSelectFile={handleSelectFile}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <ReviewPanel
        review={review}
        draft={draft}
        mode={mode}
        scoreError={scoreError}
        hasChanges={hasChanges}
        canSave={canSave}
        savePending={saveMutation.isPending}
        onDraftChange={setDraft}
        onDiscard={() => setDraft(savedDraft)}
        onSave={async () => {
          const savedReview = await saveMutation.mutateAsync({
            ...params,
            score: draft.score ? Number(draft.score) : null,
            overallFeedbackHtml: draft.overallFeedbackHtml,
            lineComments: draft.lineComments,
          });
          setDraft(createDraft(savedReview));
        }}
      />

      <div
        className={cn(
          '-mx-3 grid min-w-0 items-start gap-0 transition-[grid-template-columns] duration-200 sm:-mx-6 lg:-mx-8',
          isFileTreeCollapsed
            ? 'lg:grid-cols-[3rem_minmax(0,1fr)]'
            : 'lg:grid-cols-[20rem_minmax(0,1fr)]'
        )}
      >
        <aside className="hidden lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:self-start">
          <AttemptReviewFileTree
            files={review.changedFiles}
            activeFilePath={activeFilePath}
            collapsed={isFileTreeCollapsed}
            className="lg:h-full"
            onToggleCollapsed={() => setIsFileTreeCollapsed((value) => !value)}
            onSelectFile={handleSelectFile}
          />
        </aside>

        <AttemptReviewDiff
          files={review.changedFiles}
          comments={draft.lineComments}
          mode={mode}
          activeFilePath={activeFilePath}
          viewMode={diffViewMode}
          onCommentsChange={(lineComments) => {
            if (mode === 'editable') {
              setDraft((current) =>
                current ? { ...current, lineComments } : current
              );
            }
          }}
        />
      </div>
    </main>
  );
}

function DiffViewToggle({
  value,
  onChange,
}: {
  value: DiffViewMode;
  onChange: (value: DiffViewMode) => void;
}) {
  return (
    <div
      className="inline-grid grid-cols-2 rounded-lg bg-muted/50 p-0.5 text-xs font-medium text-muted-foreground"
      aria-label="Режим отображения diff"
    >
      {(['unified', 'split'] as const).map((mode) => {
        const selected = value === mode;

        return (
          <button
            key={mode}
            type="button"
            className={cn(
              'h-9 cursor-pointer rounded-md px-3 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'bg-background text-foreground shadow-sm'
            )}
            aria-pressed={selected}
            onClick={() => onChange(mode)}
          >
            {mode === 'unified' ? (
              <SquareSplitVertical size={14} />
            ) : (
              <SquareSplitHorizontal size={14} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ReviewPanel({
  review,
  draft,
  mode,
  scoreError,
  hasChanges,
  canSave,
  savePending,
  onDraftChange,
  onDiscard,
  onSave,
}: {
  review: AttemptReviewAggregate;
  draft: ReviewDraft;
  mode: AttemptReviewMode;
  scoreError: string | null;
  hasChanges: boolean;
  canSave: boolean;
  savePending: boolean;
  onDraftChange: Dispatch<SetStateAction<ReviewDraft>>;
  onDiscard: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <section className="-mx-3 grid gap-0 border-y bg-card sm:-mx-6 lg:-mx-8 xl:grid-cols-[20rem_minmax(0,1fr)]">
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
        </div>

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

        {mode === 'editable' ? (
          <div className="flex flex-wrap justify-start gap-2 border-t pt-4">
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
  );
}

function AttemptSelect({
  review,
  mode,
  variant = 'panel',
  className,
}: {
  review: AttemptReviewAggregate;
  mode: AttemptReviewMode;
  variant?: 'panel' | 'header';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const attempts = useMemo(() => getAttemptOptions(review), [review]);
  const currentAttempt =
    attempts.find(
      (attempt) => attempt.attemptNumber === review.current.attemptNumber
    ) ?? attempts[0];

  const headerVariant = variant === 'header';

  return (
    <div className={cn(headerVariant ? 'grid gap-1' : 'grid gap-2', className)}>
      {headerVariant ? null : <p className="text-sm font-medium">Попытка</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'group cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
              headerVariant ? 'rounded-lg' : 'rounded-xl'
            )}
            aria-label="Выбрать попытку"
          >
            <AttemptOptionCard
              attempt={currentAttempt}
              selected
              variant={headerVariant ? 'header-trigger' : 'trigger'}
              trailing={
                <ChevronsUpDown className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              }
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={headerVariant ? 'end' : 'start'}
          className="w-[var(--radix-popover-trigger-width)] min-w-72 overflow-hidden p-0"
        >
          <div className="max-h-80 overflow-y-auto">
            <div className="divide-y">
              {attempts.map((attempt) => {
                const selected =
                  attempt.attemptNumber === review.current.attemptNumber;

                return (
                  <button
                    key={attempt.attemptNumber}
                    type="button"
                    className="block w-full cursor-pointer text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
                    onClick={() => {
                      setOpen(false);

                      if (selected) {
                        return;
                      }

                      void navigate({
                        to:
                          mode === 'editable'
                            ? '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId/review'
                            : '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId/',
                        params: {
                          courseSlug: review.courseSlug,
                          taskId: review.current.task.id,
                          studentUsername: review.current.student.username,
                          attemptId: String(attempt.attemptNumber),
                        },
                      });
                    }}
                  >
                    <AttemptOptionCard
                      attempt={attempt}
                      selected={selected}
                      variant="menu-item"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface AttemptSelectOption {
  attemptNumber: number;
  submittedAt: string;
  score: number | null;
  maxScore: number;
  addedLines: number;
  deletedLines: number;
  commentCount: number;
}

function AttemptOptionCard({
  attempt,
  selected = false,
  trailing,
  variant = 'trigger',
}: {
  attempt: AttemptSelectOption;
  selected?: boolean;
  trailing?: ReactNode;
  variant?: 'trigger' | 'header-trigger' | 'menu-item';
}) {
  if (variant === 'header-trigger') {
    return (
      <div
        className={cn(
          'attempt-review-attempt-trigger flex h-9 min-w-0 items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 transition-colors hover:bg-muted/70 lg:block lg:h-auto lg:px-3 lg:py-2',
          selected && 'bg-primary/5'
        )}
      >
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">
            <span className="attempt-review-attempt-label-short">
              #{attempt.attemptNumber}
            </span>
            <span className="attempt-review-attempt-label-full">
              Попытка #{attempt.attemptNumber}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {attempt.score === null
              ? 'Не оценено'
              : `${attempt.score}/${attempt.maxScore}`}
            {trailing}
          </span>
        </div>
        <div className="mt-0.5 hidden items-center gap-2 overflow-hidden text-xs text-muted-foreground lg:flex">
          <span className="truncate">
            {formatDateTime(attempt.submittedAt)}
          </span>
          <span className="shrink-0 text-emerald-700 dark:text-emerald-300">
            +{attempt.addedLines}
          </span>
          <span className="shrink-0 text-rose-700 dark:text-rose-300">
            −{attempt.deletedLines}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" /> {attempt.commentCount}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === 'trigger'
          ? 'rounded-lg border bg-background px-2.5 py-2 transition-colors hover:border-primary'
          : 'px-3 py-2.5 transition-colors',
        selected &&
          (variant === 'trigger'
            ? 'border-primary bg-primary/5'
            : 'bg-primary/5')
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          Попытка #{attempt.attemptNumber}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {formatDateTime(attempt.submittedAt)}
          {trailing}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          {attempt.score === null
            ? 'Не оценено'
            : `${attempt.score}/${attempt.maxScore}`}
        </span>
        <span className="text-emerald-700 dark:text-emerald-300">
          +{attempt.addedLines}
        </span>
        <span className="text-rose-700 dark:text-rose-300">
          −{attempt.deletedLines}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3" /> {attempt.commentCount}
        </span>
      </div>
    </div>
  );
}

function getAttemptOptions(review: AttemptReviewAggregate) {
  const attempts = new Map<number, AttemptSelectOption>();

  const addAttempt = (attempt: AttemptSelectOption) => {
    attempts.set(attempt.attemptNumber, attempt);
  };

  review.attempts.forEach(addAttempt);

  addAttempt({
    attemptNumber: review.current.attemptNumber,
    submittedAt: review.current.submittedAt,
    score: review.current.grade?.score ?? null,
    maxScore: review.current.task.maxScore,
    addedLines: review.changedFiles.reduce(
      (sum, file) => sum + file.addedLines,
      0
    ),
    deletedLines: review.changedFiles.reduce(
      (sum, file) => sum + file.deletedLines,
      0
    ),
    commentCount: review.lineComments.length,
  });

  return Array.from(attempts.values()).sort(
    (first, second) => second.attemptNumber - first.attemptNumber
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
