import { useState } from 'react';
import { Filter } from 'lucide-react';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/shadcn/components/ui/drawer';
import { useCourseAttemptsData } from './course-attempts.data.hook';
import { useCourseAttemptsFilters } from './course-attempts.filters.hook';
import {
  useCourseAttemptsGrading,
  useCourseAttemptsQuickGradingState,
} from './course-attempts.grading.hook';
import { useCourseAttemptsQuery } from './course-attempts.queries';
import { useCourseAttemptsReviewLockSelectionSync } from './course-attempts.review-lock-selection.hook';
import { useCourseAttemptsSelection } from './course-attempts.selection.hook';
import { AttemptCard } from './course-attempts.card.component';
import { BottomActionBar } from './course-attempts.bottom-bar.component';
import {
  AttemptsFilterSidebar,
  AttemptsFiltersContent,
} from './course-attempts.sidebar.component';
import { VirtualizedAttemptsList } from './virtualized-attempts-list.component';
import type { CourseAttemptsFilters } from './course-attempts.types';

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
  const filters = useCourseAttemptsFilters({ appliedFilters, onApplyFilters });
  const quickGradingState = useCourseAttemptsQuickGradingState();
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const attemptsQuery = useCourseAttemptsQuery({
    courseSlug,
    filters: filters.normalizedAppliedFilters,
    refetchPaused: quickGradingState.quickGrading,
  });
  const { attempts, tasks, students, attemptById } = useCourseAttemptsData(
    attemptsQuery.data
  );
  const selection = useCourseAttemptsSelection(attempts);
  const grading = useCourseAttemptsGrading({
    courseSlug,
    attemptById,
    selectedAttempts: selection.selectedAttempts,
    clearSelection: selection.clearSelection,
    quickGradingState,
  });

  useCourseAttemptsReviewLockSelectionSync({
    courseSlug,
    enabled: !attemptsQuery.isPending,
    selectedAttemptIds: selection.selectedAttemptIds,
    attemptById,
    removeAttemptIds: selection.removeAttemptIds,
  });

  const filterActionsDisabledReason = grading.quickGrading
    ? 'Фильтры недоступны во время быстрой оценки. Выйдите из режима быстрой оценки.'
    : selection.selectedAttempts.length > 0
      ? 'Фильтры недоступны, пока выбраны попытки. Очистите выбор.'
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="mt-4 grid min-w-0 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <AttemptsFilterSidebar
          appliedFilters={filters.normalizedAppliedFilters}
          draftFilters={filters.draftFilters}
          attemptsCount={attempts.length}
          loading={attemptsQuery.isPending}
          tasks={tasks}
          students={students}
          filterActionsDisabledReason={filterActionsDisabledReason}
          onDraftFiltersChange={filters.setDraftFilters}
          onApplyFilters={filters.applyDraftFilters}
          onResetFilters={filters.resetFilters}
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
          ) : grading.quickGrading ? (
            <VirtualizedAttemptsList
              attempts={attempts}
              renderAttempt={(attempt) => (
                <AttemptCard
                  mode="quick-grading"
                  attempt={attempt}
                  draftScore={grading.getDraftScore(attempt)}
                  onDraftScoreChange={(score) =>
                    grading.changeDraftScore(attempt, score)
                  }
                  onDraftScoreReset={() => grading.resetDraftScore(attempt)}
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
                  selected={selection.isAttemptSelected(attempt)}
                  onSelectedChange={(checked) =>
                    selection.setAttemptSelected(attempt, checked)
                  }
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
                    appliedFilters={filters.normalizedAppliedFilters}
                    draftFilters={filters.draftFilters}
                    attemptsCount={attempts.length}
                    loading={attemptsQuery.isPending}
                    tasks={tasks}
                    students={students}
                    filterActionsDisabledReason={filterActionsDisabledReason}
                    onDraftFiltersChange={filters.setDraftFilters}
                    onApplyFilters={filters.applyDraftFilters}
                    onResetFilters={filters.resetFilters}
                    onAfterApply={() => setFiltersDrawerOpen(false)}
                    onAfterReset={() => setFiltersDrawerOpen(false)}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          <BottomActionBar
            attempts={attempts}
            selectedAttempts={selection.selectedAttempts}
            quickGrading={grading.quickGrading}
            hasDraftChanges={grading.hasDraftChanges}
            hasDraftValidationErrors={grading.hasDraftValidationErrors}
            savePending={grading.savePending}
            onSelectAll={selection.selectAll}
            onClearSelection={selection.clearSelection}
            onStartQuickGradingAll={grading.startQuickGrading}
            onOpenFilters={() => setFiltersDrawerOpen(true)}
            onSaveSelectedMaxGrade={grading.saveSelectedMaxGrade}
            onExitQuickGrading={grading.exitQuickGrading}
            onSaveQuickGrades={grading.saveQuickGrades}
          />
        </section>
      </div>
    </main>
  );
}
