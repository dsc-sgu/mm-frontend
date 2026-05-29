import { useEffect, useMemo, useState } from 'react';
import { Filter } from 'lucide-react';

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
import {
  useCourseAttemptsQuery,
  useSaveQuickGradesMutation,
} from './course-attempts.queries';
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

const EMPTY_ATTEMPTS: CourseAttempt[] = [];
const EMPTY_TASKS: CourseAttempt['task'][] = [];
const EMPTY_STUDENTS: CourseAttempt['student'][] = [];

interface CourseAttemptsPageProps {
  courseSlug: string;
  appliedFilters: CourseAttemptsFilters;
  onApplyFilters: (filters: CourseAttemptsFilters) => void;
}

export function CourseAttemptsPage({
  courseSlug,
  appliedFilters,
  onApplyFilters,
}: CourseAttemptsPageProps) {
  const normalizedAppliedFilters = useMemo(
    () => normalizeCourseAttemptsFilters(appliedFilters),
    [appliedFilters]
  );
  const [draftFilters, setDraftFilters] = useState(normalizedAppliedFilters);
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
  const tasks = attemptsQuery.data?.tasks ?? EMPTY_TASKS;
  const students = attemptsQuery.data?.students ?? EMPTY_STUDENTS;
  const selectedAttempts = attempts.filter((attempt) =>
    selectedAttemptIds.includes(attempt.id)
  );
  const quickGradingAttempts = attempts.filter((attempt) =>
    quickGradingAttemptIds.includes(attempt.id)
  );
  const isQuickGrading = quickGradingAttemptIds.length > 0;
  const hasDraftChanges = quickGradingAttempts.some((attempt) =>
    scoreDraftChanged(attempt, draftScores[attempt.id])
  );
  const hasDraftValidationErrors = quickGradingAttempts.some((attempt) =>
    Boolean(scoreDraftValidationError(attempt, draftScores[attempt.id]))
  );
  const filterActionsDisabledReason = isQuickGrading
    ? 'Фильтры недоступны во время быстрой оценки. Выйдите из режима быстрой оценки.'
    : selectedAttempts.length > 0
      ? 'Фильтры недоступны, пока выбраны попытки. Очистите выбор.'
      : undefined;

  useEffect(() => {
    setDraftFilters(normalizedAppliedFilters);
  }, [normalizedAppliedFilters]);

  useEffect(() => {
    const visibleIds = new Set(attempts.map((attempt) => attempt.id));
    setSelectedAttemptIds((current) =>
      current.filter((attemptId) => visibleIds.has(attemptId))
    );
    setQuickGradingAttemptIds((current) =>
      current.filter((attemptId) => visibleIds.has(attemptId))
    );
  }, [attempts]);

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

  async function saveSelectedBulkGrade(score: number) {
    const updates = selectedAttempts
      .filter((attempt) => !attempt.reviewLock)
      .map((attempt) => ({
        attemptId: attempt.id,
        score,
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
            <div className="space-y-3">
              {quickGradingAttempts.map((attempt) => (
                <AttemptCard
                  key={attempt.id}
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
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <AttemptCard
                  key={attempt.id}
                  mode="default"
                  attempt={attempt}
                  courseSlug={courseSlug}
                  selected={selectedAttemptIds.includes(attempt.id)}
                  onSelectedChange={(checked) =>
                    setSelectedAttemptIds((current) =>
                      checked
                        ? Array.from(new Set([...current, attempt.id]))
                        : current.filter(
                            (attemptId) => attemptId !== attempt.id
                          )
                    )
                  }
                />
              ))}
            </div>
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
                    <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                      {attempts.length}
                    </span>
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
              setSelectedAttemptIds(attempts.map((attempt) => attempt.id))
            }
            onClearSelection={() => setSelectedAttemptIds([])}
            onStartQuickGradingAll={() => startQuickGrading(attempts)}
            onOpenFilters={() => setFiltersDrawerOpen(true)}
            onSaveSelectedBulkGrade={saveSelectedBulkGrade}
            onExitQuickGrading={exitQuickGrading}
            onFeedbackTextVisibleChange={setFeedbackTextVisible}
            onSaveQuickGrades={saveQuickGrades}
          />
        </section>
      </div>
    </main>
  );
}
