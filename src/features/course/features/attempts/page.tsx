import { useState } from 'react';
import { Filter } from 'lucide-react';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/shadcn/components/ui/drawer';
import { useCourseAttemptsData } from './hooks/use-data';
import { useCourseAttemptsFilters } from './hooks/use-filters';
import {
  useCourseAttemptsGrading,
  useCourseAttemptsQuickGradingState,
} from './hooks/use-grading';
import { useCourseAttemptsQuery } from './api/queries';
import { useCourseAttemptsReviewLockSelectionSync } from './hooks/use-review-lock-selection';
import {
  getCourseAttemptsFilterActionsDisabledReason,
  getCourseAttemptsPageMode,
} from './model/page-mode';
import { isAttemptSelectable } from './model/selection';
import { useCourseAttemptsSelection } from './hooks/use-selection';
import { AttemptCard } from './ui/card';
import {
  BottomActionBar,
  IdleBottomActions,
  QuickGradingBottomActions,
  SelectionBottomActions,
} from './ui/bottom-bar';
import { AttemptsFilterSidebar, AttemptsFiltersContent } from './ui/sidebar';
import { VirtualizedAttemptsList } from './ui/virtualized-list';
import type { CourseAttemptsFilters } from './model/types';

type CourseAttemptsPageProps = {
  courseSlug: string;
  appliedFilters: CourseAttemptsFilters;
  onApplyFilters: (filters: CourseAttemptsFilters) => void;
};

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

  const selectedAttemptsCount = selection.selectedAttempts.length;
  const hasSelectableAttempts = attempts.some(isAttemptSelectable);
  const pageMode = getCourseAttemptsPageMode({
    loading: attemptsQuery.isPending,
    attemptsCount: attempts.length,
    quickGrading: grading.quickGrading,
    selectedAttemptsCount,
  });
  const filterActionsDisabledReason =
    getCourseAttemptsFilterActionsDisabledReason(pageMode);

  const filtersPanel = {
    appliedFilters: filters.normalizedAppliedFilters,
    draftFilters: filters.draftFilters,
    attemptsCount: attempts.length,
    loading: attemptsQuery.isPending,
    tasks,
    students,
    filterActionsDisabledReason,
    onDraftFiltersChange: filters.setDraftFilters,
    onApplyFilters: filters.applyDraftFilters,
    onResetFilters: filters.resetFilters,
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="mt-4 grid min-w-0 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <AttemptsFilterSidebar panel={filtersPanel} />

        <section className="min-w-0 overflow-hidden pb-44 sm:pb-36">
          {pageMode === 'loading' ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-3xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : pageMode === 'empty' ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
              <h2 className="text-xl font-semibold">Попытки не найдены</h2>
              <p className="mt-2 text-muted-foreground">
                Измените фильтры и нажмите «Применить».
              </p>
            </div>
          ) : pageMode === 'quick-grading' ? (
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
                <DrawerHeader className="shrink-0 px-4 pt-5 pb-3 text-left">
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
                <div className="min-h-0 flex-1 scroll-pb-24 overflow-y-auto overscroll-contain px-4">
                  <AttemptsFiltersContent
                    idPrefix="mobile"
                    panel={filtersPanel}
                    showHeader={false}
                    variant="drawer"
                    onAfterApply={() => setFiltersDrawerOpen(false)}
                    onAfterReset={() => setFiltersDrawerOpen(false)}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          <BottomActionBar>
            {pageMode === 'quick-grading' ? (
              <QuickGradingBottomActions
                hasDraftChanges={grading.hasDraftChanges}
                hasDraftValidationErrors={grading.hasDraftValidationErrors}
                savePending={grading.savePending}
                onExitQuickGrading={grading.exitQuickGrading}
                onSaveQuickGrades={grading.saveQuickGrades}
              />
            ) : pageMode === 'selection' ? (
              <SelectionBottomActions
                selectedCount={selectedAttemptsCount}
                savePending={grading.savePending}
                onClearSelection={selection.clearSelection}
                onSaveSelectedMaxGrade={grading.saveSelectedMaxGrade}
              />
            ) : (
              <IdleBottomActions
                hasAttempts={attempts.length > 0}
                hasSelectableAttempts={hasSelectableAttempts}
                onSelectAll={selection.selectAll}
                onStartQuickGradingAll={grading.startQuickGrading}
                onOpenFilters={() => setFiltersDrawerOpen(true)}
              />
            )}
          </BottomActionBar>
        </section>
      </div>
    </main>
  );
}
