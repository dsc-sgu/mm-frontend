// PROTOTYPE (#121): normal-mode Course Attempts with the page-wide, pinned
// top bar in place of the filter sidebar and the bottom action bar (bulk
// selection is gone, #114). It shows while #121 is on in the prototype bar.
// The list is the compact row from quick grading without the Grade field; the
// whole row opens the Attempt (#117). "Быстрая оценка" (Alt+G) starts quick
// grading over the applied filters, and the same bar then shows them as
// locked chips.
import { useEffect, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import type {
  CourseAttempt,
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';
import { FilterBar } from './filter-bar';
import { FixedRowsList, ListHeader } from './list';
import { withRealisticNames, withRealisticStudentNames } from './names';
import { rowLayoutFor } from './columns';
import { QuickRow, type RowLayout } from './row';
import { StickyTop } from './top-bar';
import { useFixedRowsVirtualizer } from './use-fixed-rows';

const ROW_HEIGHT: Record<RowLayout, number> = {
  wide: 64,
  medium: 88,
  stacked: 124,
};

// No feedback zone, so the measured breakpoints of the narrower row apply.
const BROWSE_TIER_FROM = {
  wide: '(min-width: 1200px)',
  medium: '(min-width: 920px)',
};

export function BrowsePrototype({
  courseSlug,
  attempts: loadedAttempts,
  loading,
  tasks,
  students: loadedStudents,
  applied,
  draft,
  onDraftChange,
  onApplyDraft,
  onReset,
  onStartQuickGrading,
}: {
  courseSlug: string;
  attempts: readonly CourseAttempt[];
  loading: boolean;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  applied: CourseAttemptsFilters;
  draft: CourseAttemptsFilters;
  onDraftChange: (filters: CourseAttemptsFilters) => void;
  onApplyDraft: () => void;
  onReset: () => void;
  onStartQuickGrading: () => void;
}) {
  'use no memo';

  const navigate = useNavigate();
  const wideTier = useMediaQuery(BROWSE_TIER_FROM.wide);
  const mediumTier = useMediaQuery(BROWSE_TIER_FROM.medium);
  const layout = rowLayoutFor(wideTier, mediumTier);
  const rowHeight = ROW_HEIGHT[layout];

  const attempts = useMemo(
    () => withRealisticNames(loadedAttempts),
    [loadedAttempts]
  );
  const students = useMemo(
    () => withRealisticStudentNames(loadedStudents),
    [loadedStudents]
  );

  const { virtualizer, setListRef, scrollMargin } = useFixedRowsVirtualizer({
    count: attempts.length,
    rowHeight,
    getKey: (index) => attempts[index]?.id ?? index,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

  const openAttempt = (attempt: CourseAttempt) =>
    void navigate({
      to: '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId/review',
      params: {
        courseSlug,
        taskId: String(attempt.task.id),
        studentUsername: attempt.student.username,
        attemptId: String(attempt.attemptNumber),
      },
    });

  const showListHeader =
    !loading && attempts.length > 0 && layout !== 'stacked';

  return (
    <main className="mx-auto flex w-full flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="mt-1 min-w-0 sm:mt-3">
        <StickyTop>
          <FilterBar
            applied={applied}
            draft={draft}
            tasks={tasks}
            students={students}
            count={attempts.length}
            loading={loading}
            onDraftChange={onDraftChange}
            onApplyDraft={onApplyDraft}
            onReset={onReset}
            onStartQuickGrading={onStartQuickGrading}
          />
          {showListHeader ? <ListHeader feedbackColumn="none" /> : null}
        </StickyTop>

        <section className="min-w-0 pb-24">{renderList()}</section>
      </div>
    </main>
  );

  function renderList() {
    if (loading) {
      return (
        <div
          aria-busy="true"
          className="h-96 animate-pulse rounded-2xl border bg-muted"
        />
      );
    }

    if (attempts.length === 0) {
      return (
        <div
          className={cn(
            'rounded-2xl border border-dashed bg-card p-10 text-center'
          )}
        >
          <h2 className="text-lg font-semibold">Попытки не найдены</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Измените или сбросьте фильтры.
          </p>
        </div>
      );
    }

    return (
      <FixedRowsList
        attempts={attempts}
        rowHeight={rowHeight}
        virtualizer={virtualizer}
        setListRef={setListRef}
        scrollMargin={scrollMargin}
        renderRow={(attempt) => (
          <QuickRow
            layout={layout}
            feedbackColumn="none"
            attempt={attempt}
            entry={undefined}
            outcome={undefined}
            error={null}
            saving={false}
            gradeable={false}
            gradeInputRef={() => {}}
            onGradeChange={() => {}}
            onGradeKeyDown={() => {}}
            onActivate={() => openAttempt(attempt)}
            feedbackCell={null}
          />
        )}
      />
    );
  }
}
