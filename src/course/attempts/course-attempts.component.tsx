import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/shadcn/components/ui/drawer';
import {
  EMPTY_COURSE_ATTEMPTS_FILTERS,
  normalizeCourseAttemptsFilters,
} from './course-attempts.filters';
import {
  scoreDraftChanged,
  scoreDraftValidationError,
  scoreValue,
} from './course-attempts.grading';
import { isAttemptSelectable } from './course-attempts.selection';
import {
  useCourseAttemptsQuery,
  useSaveQuickGradesMutation,
} from './course-attempts.queries';
import { useCourseAttemptReviewLockUpdates } from './course-attempts.lock-updates.hook';
import type { CourseAttemptReviewLockUpdate } from './course-attempts.lock-updates';
import { AttemptCard } from './course-attempts.card.component';
import { BottomActionBar } from './course-attempts.bottom-bar.component';
import {
  AttemptsFilterSidebar,
  AttemptsFiltersContent,
} from './course-attempts.sidebar.component';
import type {
  CourseAttempt,
  CourseAttemptsFilters,
} from './course-attempts.types';

const VIRTUAL_ATTEMPT_ESTIMATED_HEIGHT = 220;
const VIRTUAL_ATTEMPT_OVERSCAN = 6;
const VIRTUAL_ATTEMPT_GAP = 12;

function useElementPageOffsetTop<TElement extends HTMLElement>() {
  const elementRef = useRef<TElement | null>(null);
  const [offsetTop, setOffsetTop] = useState(0);

  const measureOffsetTop = useCallback(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    setOffsetTop(element.getBoundingClientRect().top + window.scrollY);
  }, []);

  const setElementRef = useCallback(
    (element: TElement | null) => {
      elementRef.current = element;

      if (element) {
        window.requestAnimationFrame(measureOffsetTop);
      }
    },
    [measureOffsetTop]
  );

  useLayoutEffect(() => {
    measureOffsetTop();

    const element = elementRef.current;

    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver(measureOffsetTop);
    resizeObserver.observe(element);
    window.addEventListener('resize', measureOffsetTop);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureOffsetTop);
    };
  }, [measureOffsetTop]);

  return [setElementRef, offsetTop] as const;
}

function VirtualizedAttemptsList({
  attempts,
  renderAttempt,
}: {
  attempts: CourseAttempt[];
  renderAttempt: (attempt: CourseAttempt) => ReactNode;
}) {
  'use no memo';

  const [setListRef, scrollMargin] = useElementPageOffsetTop<HTMLDivElement>();
  const virtualizer = useWindowVirtualizer({
    count: attempts.length,
    estimateSize: () => VIRTUAL_ATTEMPT_ESTIMATED_HEIGHT,
    getItemKey: (index) => attempts[index]?.id ?? index,
    gap: VIRTUAL_ATTEMPT_GAP,
    overscan: VIRTUAL_ATTEMPT_OVERSCAN,
    scrollMargin,
    measureElement: (element) => element.getBoundingClientRect().height,
  });
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={setListRef}
      className="relative"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualItems.map((virtualItem) => {
        const attempt = attempts[virtualItem.index];

        if (!attempt) {
          return null;
        }

        return (
          <div
            key={virtualItem.key}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${virtualItem.start - scrollMargin}px)`,
            }}
          >
            {renderAttempt(attempt)}
          </div>
        );
      })}
    </div>
  );
}

interface CourseAttemptsPageProps {
  courseSlug: string;
  appliedFilters: CourseAttemptsFilters;
  onApplyFilters: (filters: CourseAttemptsFilters) => void;
}

function courseAttemptsFiltersKey(filters: CourseAttemptsFilters) {
  return `${filters.graded}|${filters.tasks.join(',')}|${filters.students.join(',')}`;
}

function renderLockedSelectionToastDescription(attempts: CourseAttempt[]) {
  const visibleAttempts = attempts.slice(0, 3);
  const hiddenAttemptsCount = attempts.length - visibleAttempts.length;

  return (
    <div className="max-w-full space-y-2 overflow-hidden">
      <p>
        {attempts.length === 1
          ? 'Попытка снята с выбора, потому что её взяли на проверку.'
          : `С выбора снято попыток: ${attempts.length}. Их взяли на проверку.`}
      </p>
      <ul className="max-w-full space-y-1 overflow-hidden">
        {visibleAttempts.map((attempt) => (
          <li key={attempt.id} className="max-w-full break-words">
            {attempt.task.title} — {attempt.student.fullName}
          </li>
        ))}
        {hiddenAttemptsCount > 0 ? <li>И ещё: {hiddenAttemptsCount}</li> : null}
      </ul>
    </div>
  );
}

// 'attempts' variable is used in memo variables
const EMPTY_ATTEMPTS: CourseAttempt[] = [];

export function CourseAttemptsPage({
  courseSlug,
  appliedFilters,
  onApplyFilters,
}: CourseAttemptsPageProps) {
  const normalizedAppliedFilters = useMemo(
    () => normalizeCourseAttemptsFilters(appliedFilters),
    [appliedFilters]
  );
  const appliedFiltersKey = useMemo(
    () => courseAttemptsFiltersKey(normalizedAppliedFilters),
    [normalizedAppliedFilters]
  );
  const [draftFiltersState, setDraftFiltersState] = useState(() => ({
    appliedFiltersKey,
    filters: normalizedAppliedFilters,
  }));
  const draftFilters =
    draftFiltersState.appliedFiltersKey === appliedFiltersKey
      ? draftFiltersState.filters
      : normalizedAppliedFilters;
  const [selectedAttemptIds, setSelectedAttemptIds] = useState<string[]>([]);
  const [quickGradingAttemptIds, setQuickGradingAttemptIds] = useState<
    string[]
  >([]);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [feedbackTextVisible, setFeedbackTextVisible] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const attemptsQuery = useCourseAttemptsQuery({
    courseSlug,
    filters: normalizedAppliedFilters,
  });
  const saveQuickGradesMutation = useSaveQuickGradesMutation();

  const attempts = attemptsQuery.data?.attempts ?? EMPTY_ATTEMPTS;
  const tasks = attemptsQuery.data?.tasks ?? [];
  const students = attemptsQuery.data?.students ?? [];
  const selectedAttemptIdSet = useMemo(
    () => new Set(selectedAttemptIds),
    [selectedAttemptIds]
  );
  const attemptById = useMemo(
    () => new Map(attempts.map((attempt) => [attempt.id, attempt])),
    [attempts]
  );
  const quickGradingAttemptIdSet = useMemo(
    () => new Set(quickGradingAttemptIds),
    [quickGradingAttemptIds]
  );
  const selectedAttempts = useMemo(
    () =>
      attempts.filter(
        (attempt) =>
          selectedAttemptIdSet.has(attempt.id) && isAttemptSelectable(attempt)
      ),
    [attempts, selectedAttemptIdSet]
  );
  const quickGradingAttempts = useMemo(
    () =>
      attempts.filter((attempt) => quickGradingAttemptIdSet.has(attempt.id)),
    [attempts, quickGradingAttemptIdSet]
  );
  const isQuickGrading = quickGradingAttemptIds.length > 0;
  const hasDraftChanges = useMemo(
    () =>
      quickGradingAttempts.some((attempt) =>
        scoreDraftChanged(attempt, draftScores[attempt.id])
      ),
    [draftScores, quickGradingAttempts]
  );
  const hasDraftValidationErrors = useMemo(
    () =>
      quickGradingAttempts.some((attempt) =>
        Boolean(scoreDraftValidationError(attempt, draftScores[attempt.id]))
      ),
    [draftScores, quickGradingAttempts]
  );
  const filterActionsDisabledReason = isQuickGrading
    ? 'Фильтры недоступны во время быстрой оценки. Выйдите из режима быстрой оценки.'
    : selectedAttempts.length > 0
      ? 'Фильтры недоступны, пока выбраны попытки. Очистите выбор.'
      : undefined;

  const selectedAttemptIdsRef = useRef(selectedAttemptIds);
  const attemptByIdRef = useRef(attemptById);

  useEffect(() => {
    selectedAttemptIdsRef.current = selectedAttemptIds;
    attemptByIdRef.current = attemptById;
  }, [attemptById, selectedAttemptIds]);

  const handleReviewLockUpdates = useCallback(
    (updates: CourseAttemptReviewLockUpdate[]) => {
      const lockedAttemptIds = new Set(
        updates
          .filter((update) => update.reviewLock)
          .map((update) => update.attemptId)
      );

      if (lockedAttemptIds.size === 0) {
        return;
      }

      const lockedSelectedAttempts = selectedAttemptIdsRef.current
        .filter((attemptId) => lockedAttemptIds.has(attemptId))
        .map((attemptId) => attemptByIdRef.current.get(attemptId))
        .filter((attempt): attempt is CourseAttempt => Boolean(attempt));

      if (lockedSelectedAttempts.length === 0) {
        return;
      }

      setSelectedAttemptIds((current) =>
        current.filter((attemptId) => !lockedAttemptIds.has(attemptId))
      );
      toast.warning('Выбор обновлён', {
        description: renderLockedSelectionToastDescription(
          lockedSelectedAttempts
        ),
      });
    },
    []
  );

  useCourseAttemptReviewLockUpdates({
    courseSlug,
    enabled: !attemptsQuery.isPending,
    onUpdates: handleReviewLockUpdates,
  });

  function setDraftFilters(filters: CourseAttemptsFilters) {
    setDraftFiltersState({
      appliedFiltersKey,
      filters: normalizeCourseAttemptsFilters(filters),
    });
  }

  function startQuickGrading(targetAttempts: CourseAttempt[]) {
    setQuickGradingAttemptIds(targetAttempts.map((attempt) => attempt.id));
    setDraftScores(
      Object.fromEntries(
        targetAttempts.map((attempt) => [attempt.id, scoreValue(attempt)])
      )
    );
    setSelectedAttemptIds([]);
    setFeedbackTextVisible(false);
  }

  function exitQuickGrading() {
    setQuickGradingAttemptIds([]);
    setDraftScores({});
    setFeedbackTextVisible(false);
  }

  async function saveSelectedMaxGrade() {
    const updates = selectedAttempts
      .filter(isAttemptSelectable)
      .map((attempt) => ({
        attemptId: attempt.id,
        score: attempt.task.maxScore,
      }));

    if (updates.length === 0) {
      return;
    }

    await saveQuickGradesMutation.mutateAsync({
      courseSlug,
      updates,
      clearFeedbackText: false,
    });
    setSelectedAttemptIds([]);
  }

  async function saveQuickGrades() {
    if (hasDraftValidationErrors) {
      return;
    }

    const updates = quickGradingAttempts
      .filter(
        (attempt) =>
          !attempt.reviewLock &&
          scoreDraftChanged(attempt, draftScores[attempt.id])
      )
      .map((attempt) => ({
        attemptId: attempt.id,
        score: Math.max(0, Number(draftScores[attempt.id] || 0)),
      }));

    if (updates.length === 0) {
      return;
    }

    await saveQuickGradesMutation.mutateAsync({
      courseSlug,
      updates,
      clearFeedbackText: !feedbackTextVisible,
    });
    exitQuickGrading();
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="mt-4 grid min-w-0 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <AttemptsFilterSidebar
          appliedFilters={normalizedAppliedFilters}
          draftFilters={draftFilters}
          attemptsCount={attempts.length}
          loading={attemptsQuery.isPending}
          tasks={tasks}
          students={students}
          filterActionsDisabledReason={filterActionsDisabledReason}
          onDraftFiltersChange={(filters) =>
            setDraftFilters(normalizeCourseAttemptsFilters(filters))
          }
          onApplyFilters={() => onApplyFilters(draftFilters)}
          onResetFilters={() => {
            setDraftFilters(EMPTY_COURSE_ATTEMPTS_FILTERS);
            onApplyFilters(EMPTY_COURSE_ATTEMPTS_FILTERS);
          }}
        />

        <section className="min-w-0 overflow-hidden pb-44 sm:pb-36">
          {attemptsQuery.isPending ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-3xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : attempts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
              <h2 className="text-xl font-semibold">Попытки не найдены</h2>
              <p className="mt-2 text-muted-foreground">
                Измените фильтры и нажмите «Применить».
              </p>
            </div>
          ) : isQuickGrading ? (
            <VirtualizedAttemptsList
              attempts={quickGradingAttempts}
              renderAttempt={(attempt) => (
                <AttemptCard
                  mode="quick-grading"
                  attempt={attempt}
                  draftScore={draftScores[attempt.id] ?? ''}
                  onDraftScoreChange={(score) =>
                    setDraftScores((current) => ({
                      ...current,
                      [attempt.id]: score,
                    }))
                  }
                />
              )}
            />
          ) : (
            <VirtualizedAttemptsList
              attempts={attempts}
              renderAttempt={(attempt) => (
                <AttemptCard
                  mode="default"
                  attempt={attempt}
                  courseSlug={courseSlug}
                  selected={
                    isAttemptSelectable(attempt) &&
                    selectedAttemptIdSet.has(attempt.id)
                  }
                  onSelectedChange={(checked) => {
                    if (!isAttemptSelectable(attempt)) {
                      return;
                    }

                    setSelectedAttemptIds((current) =>
                      checked
                        ? Array.from(new Set([...current, attempt.id]))
                        : current.filter(
                            (attemptId) => attemptId !== attempt.id
                          )
                    );
                  }}
                />
              )}
            />
          )}

          <div className="lg:hidden">
            <Drawer
              open={filtersDrawerOpen}
              onOpenChange={setFiltersDrawerOpen}
            >
              <DrawerContent className="rounded-t-3xl">
                <DrawerHeader className="shrink-0 px-4 pb-3 pt-5 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <DrawerTitle className="flex items-center gap-2 text-base">
                        <Filter className="size-4" /> Фильтры попыток
                      </DrawerTitle>
                    </div>
                    {attemptsQuery.isPending ? (
                      <span
                        className="h-7 w-24 animate-pulse rounded-full bg-muted"
                        aria-label="Загрузка количества попыток"
                      />
                    ) : (
                      <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                        Попыток: {attempts.length}
                      </span>
                    )}
                  </div>
                </DrawerHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 scroll-pb-24 overscroll-contain">
                  <AttemptsFiltersContent
                    idPrefix="mobile"
                    showHeader={false}
                    variant="drawer"
                    appliedFilters={normalizedAppliedFilters}
                    draftFilters={draftFilters}
                    attemptsCount={attempts.length}
                    loading={attemptsQuery.isPending}
                    tasks={tasks}
                    students={students}
                    filterActionsDisabledReason={filterActionsDisabledReason}
                    onDraftFiltersChange={(filters) =>
                      setDraftFilters(normalizeCourseAttemptsFilters(filters))
                    }
                    onApplyFilters={() => onApplyFilters(draftFilters)}
                    onResetFilters={() => {
                      setDraftFilters(EMPTY_COURSE_ATTEMPTS_FILTERS);
                      onApplyFilters(EMPTY_COURSE_ATTEMPTS_FILTERS);
                    }}
                    onAfterApply={() => setFiltersDrawerOpen(false)}
                    onAfterReset={() => setFiltersDrawerOpen(false)}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          <BottomActionBar
            attempts={attempts}
            selectedAttempts={selectedAttempts}
            quickGrading={isQuickGrading}
            hasDraftChanges={hasDraftChanges}
            hasDraftValidationErrors={hasDraftValidationErrors}
            feedbackTextVisible={feedbackTextVisible}
            savePending={saveQuickGradesMutation.isPending}
            onSelectAll={() =>
              setSelectedAttemptIds(
                attempts
                  .filter(isAttemptSelectable)
                  .map((attempt) => attempt.id)
              )
            }
            onClearSelection={() => setSelectedAttemptIds([])}
            onStartQuickGradingAll={() => startQuickGrading(attempts)}
            onOpenFilters={() => setFiltersDrawerOpen(true)}
            onSaveSelectedMaxGrade={saveSelectedMaxGrade}
            onExitQuickGrading={exitQuickGrading}
            onFeedbackTextVisibleChange={setFeedbackTextVisible}
            onSaveQuickGrades={saveQuickGrades}
          />
        </section>
      </div>
    </main>
  );
}
