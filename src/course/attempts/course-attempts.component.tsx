import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Map as ImmutableMap, Set as ImmutableSet } from 'immutable';
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
  areCourseAttemptsFiltersEqual,
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

interface CourseAttemptsPageProps {
  courseSlug: string;
  appliedFilters: CourseAttemptsFilters;
  onApplyFilters: (filters: CourseAttemptsFilters) => void;
}

// 'attempts' variable is used in memo variables
const EMPTY_ATTEMPTS: CourseAttempt[] = [];

export function CourseAttemptsPage({
  courseSlug,
  appliedFilters,
  onApplyFilters,
}: CourseAttemptsPageProps) {
  const { normalizedAppliedFilters, draftFilters, setDraftFilters } =
    useCourseAttemptsDraftFilters(appliedFilters);
  const [selectedAttemptIds, setSelectedAttemptIds] = useState(() =>
    ImmutableSet<string>()
  );
  const [quickGrading, setQuickGrading] = useState(false);
  const [draftScoresByAttemptId, setDraftScoresByAttemptId] = useState(() =>
    ImmutableMap<string, string>()
  );
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const attemptsQuery = useCourseAttemptsQuery({
    courseSlug,
    filters: normalizedAppliedFilters,
    refetchPaused: quickGrading,
  });
  const saveQuickGradesMutation = useSaveQuickGradesMutation();

  const attempts = attemptsQuery.data?.attempts ?? EMPTY_ATTEMPTS;
  const tasks = attemptsQuery.data?.tasks ?? [];
  const students = attemptsQuery.data?.students ?? [];
  const attemptById = useMemo(
    () => new Map(attempts.map((attempt) => [attempt.id, attempt])),
    [attempts]
  );
  const selectedAttempts = useMemo(
    () =>
      attempts.filter(
        (attempt) =>
          selectedAttemptIds.has(attempt.id) && isAttemptSelectable(attempt)
      ),
    [attempts, selectedAttemptIds]
  );
  const hasDraftChanges = !draftScoresByAttemptId.isEmpty();
  const hasDraftValidationErrors = useMemo(
    () =>
      draftScoresByAttemptId.some((draftScore, attemptId) => {
        const attempt = attemptById.get(attemptId);

        return attempt
          ? Boolean(scoreDraftValidationError(attempt, draftScore))
          : false;
      }),
    [attemptById, draftScoresByAttemptId]
  );
  const filterActionsDisabledReason = quickGrading
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
        .filter((attempt): attempt is CourseAttempt => Boolean(attempt))
        .toArray();

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

  function startQuickGrading() {
    setQuickGrading(true);
    setDraftScoresByAttemptId(ImmutableMap<string, string>());
    setSelectedAttemptIds(ImmutableSet<string>());
  }

  function exitQuickGrading() {
    setQuickGrading(false);
    setDraftScoresByAttemptId(ImmutableMap<string, string>());
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
    });
    setSelectedAttemptIds(ImmutableSet<string>());
  }

  async function saveQuickGrades() {
    if (hasDraftValidationErrors) {
      return;
    }

    const updates: Array<{ attemptId: string; score: number }> = [];

    draftScoresByAttemptId.forEach((draftScore, attemptId) => {
      const attempt = attemptById.get(attemptId);

      if (
        !attempt ||
        attempt.reviewLock ||
        !scoreDraftChanged(attempt, draftScore)
      ) {
        return;
      }

      updates.push({
        attemptId,
        score: Math.max(0, Number(draftScore)),
      });
    });

    if (updates.length === 0) {
      return;
    }

    await saveQuickGradesMutation.mutateAsync({
      courseSlug,
      updates,
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
          ) : quickGrading ? (
            <VirtualizedAttemptsList
              attempts={attempts}
              renderAttempt={(attempt) => (
                <AttemptCard
                  mode="quick-grading"
                  attempt={attempt}
                  draftScore={
                    draftScoresByAttemptId.get(attempt.id) ??
                    scoreValue(attempt)
                  }
                  onDraftScoreChange={(score) =>
                    setDraftScoresByAttemptId((current) =>
                      score === scoreValue(attempt)
                        ? current.remove(attempt.id)
                        : current.set(attempt.id, score)
                    )
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
                    selectedAttemptIds.has(attempt.id)
                  }
                  onSelectedChange={(checked) => {
                    if (!isAttemptSelectable(attempt)) {
                      return;
                    }

                    setSelectedAttemptIds((current) =>
                      checked
                        ? current.add(attempt.id)
                        : current.remove(attempt.id)
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
            quickGrading={quickGrading}
            hasDraftChanges={hasDraftChanges}
            hasDraftValidationErrors={hasDraftValidationErrors}
            savePending={saveQuickGradesMutation.isPending}
            onSelectAll={() =>
              setSelectedAttemptIds(
                ImmutableSet(
                  attempts
                    .filter(isAttemptSelectable)
                    .map((attempt) => attempt.id)
                )
              )
            }
            onClearSelection={() =>
              setSelectedAttemptIds(ImmutableSet<string>())
            }
            onStartQuickGradingAll={startQuickGrading}
            onOpenFilters={() => setFiltersDrawerOpen(true)}
            onSaveSelectedMaxGrade={saveSelectedMaxGrade}
            onExitQuickGrading={exitQuickGrading}
            onSaveQuickGrades={saveQuickGrades}
          />
        </section>
      </div>
    </main>
  );
}

function useCourseAttemptsDraftFilters(appliedFilters: CourseAttemptsFilters) {
  const normalizedAppliedFilters = useMemo(
    () => normalizeCourseAttemptsFilters(appliedFilters),
    [appliedFilters]
  );
  const [draftState, setDraftState] = useState(() => ({
    baseAppliedFilters: normalizedAppliedFilters,
    draftFilters: normalizedAppliedFilters,
  }));

  // If filters changed outside of this component, for example via URL navigation,
  // discard the stale draft and start from the new applied filters.
  const draftFilters = areCourseAttemptsFiltersEqual(
    draftState.baseAppliedFilters,
    normalizedAppliedFilters
  )
    ? draftState.draftFilters
    : normalizedAppliedFilters;

  const setDraftFilters = useCallback(
    (filters: CourseAttemptsFilters) => {
      setDraftState({
        baseAppliedFilters: normalizedAppliedFilters,
        draftFilters: normalizeCourseAttemptsFilters(filters),
      });
    },
    [normalizedAppliedFilters]
  );

  return {
    normalizedAppliedFilters,
    draftFilters,
    setDraftFilters,
  };
}

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
