import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { cn } from '@/shadcn/lib/utils';
import { FilterMultiSelect } from './filter-multi-select';
import {
  areCourseAttemptsFiltersEqual,
  EMPTY_COURSE_ATTEMPTS_FILTERS,
} from '@/features/course/features/attempts/model/filters';
import type {
  CourseAttempt,
  CourseAttemptGradedFilter,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';

const GRADED_FILTER_OPTIONS: Array<{
  value: CourseAttemptGradedFilter;
  label: string;
}> = [
  { value: 'any', label: 'Неважно' },
  { value: 'no', label: 'Нет' },
  { value: 'yes', label: 'Да' },
];

export function AttemptsFiltersContent({
  idPrefix,
  panel,
  onAfterApply,
  onAfterReset,
  showHeader = true,
  variant = 'sidebar',
}: AttemptsFiltersContentProps) {
  const {
    appliedFilters,
    draftFilters,
    attemptsCount,
    loading,
    tasks,
    students,
    filterActionsDisabledReason,
    onDraftFiltersChange,
    onApplyFilters,
    onResetFilters,
  } = panel;
  const filterActionsDisabled = Boolean(filterActionsDisabledReason);
  const filterSectionContext = {
    idPrefix,
    loading,
    filterActionsDisabled,
    variant,
    tasks,
    students,
  };
  const [taskSearch, setTaskSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const applyDisabled =
    filterActionsDisabled ||
    areCourseAttemptsFiltersEqual(draftFilters, appliedFilters);
  const resetDisabled =
    filterActionsDisabled ||
    (areCourseAttemptsFiltersEqual(
      draftFilters,
      EMPTY_COURSE_ATTEMPTS_FILTERS
    ) &&
      areCourseAttemptsFiltersEqual(
        appliedFilters,
        EMPTY_COURSE_ATTEMPTS_FILTERS
      ) &&
      taskSearch.trim() === '' &&
      studentSearch.trim() === '');
  const appliedTaskSet = useMemo(
    () => new Set(appliedFilters.tasks),
    [appliedFilters.tasks]
  );
  const appliedStudentSet = useMemo(
    () => new Set(appliedFilters.students),
    [appliedFilters.students]
  );
  const normalizedTaskSearch = taskSearch.toLowerCase().trim();
  const normalizedStudentSearch = studentSearch.toLowerCase().trim();
  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) =>
          task.title.toLowerCase().includes(normalizedTaskSearch)
        )
        .sort((firstTask, secondTask) =>
          compareSelectedFirst(
            firstTask,
            secondTask,
            appliedTaskSet,
            (task) => task.id,
            (task) => task.title
          )
        ),
    [appliedTaskSet, normalizedTaskSearch, tasks]
  );
  const visibleStudents = useMemo(
    () =>
      students
        .filter((student) =>
          `${student.fullName} ${student.username}`
            .toLowerCase()
            .includes(normalizedStudentSearch)
        )
        .sort((firstStudent, secondStudent) =>
          compareSelectedFirst(
            firstStudent,
            secondStudent,
            appliedStudentSet,
            (student) => student.username,
            (student) => student.fullName
          )
        ),
    [appliedStudentSet, normalizedStudentSearch, students]
  );

  function applyFilters() {
    onApplyFilters();
    setTaskSearch('');
    setStudentSearch('');
    onAfterApply?.();
  }

  function resetFilters() {
    onDraftFiltersChange(EMPTY_COURSE_ATTEMPTS_FILTERS);
    onResetFilters();
    setTaskSearch('');
    setStudentSearch('');
    onAfterReset?.();
  }

  return (
    <>
      {showHeader ? (
        <AttemptsFiltersHeader
          attemptsCount={attemptsCount}
          loading={loading}
        />
      ) : null}

      <div className={cn(showHeader ? 'mt-5' : 'mt-0', 'space-y-6')}>
        <TasksFilterSection
          context={filterSectionContext}
          search={taskSearch}
          tasks={visibleTasks}
          selectedTaskIds={draftFilters.tasks}
          onSearchChange={setTaskSearch}
          onSelectedTaskIdsChange={(tasks) =>
            onDraftFiltersChange({
              ...draftFilters,
              tasks,
            })
          }
        />

        <StudentsFilterSection
          context={filterSectionContext}
          search={studentSearch}
          students={visibleStudents}
          selectedStudentUsernames={draftFilters.students}
          onSearchChange={setStudentSearch}
          onSelectedStudentUsernamesChange={(students) =>
            onDraftFiltersChange({
              ...draftFilters,
              students,
            })
          }
        />

        <GradedFilterSection
          graded={draftFilters.graded}
          onGradedChange={(graded) =>
            onDraftFiltersChange({
              ...draftFilters,
              graded,
            })
          }
        />
      </div>

      <AttemptsFiltersActions
        applyDisabled={applyDisabled}
        resetDisabled={resetDisabled}
        filterActionsDisabledReason={filterActionsDisabledReason}
        variant={variant}
        onApply={applyFilters}
        onReset={resetFilters}
      />
    </>
  );
}

export function AttemptsFilterSidebar(
  props: Omit<
    AttemptsFiltersContentProps,
    'idPrefix' | 'onAfterApply' | 'onAfterReset' | 'variant'
  >
) {
  return (
    <aside className="hidden min-w-0 lg:sticky lg:top-4 lg:block lg:self-start">
      <div
        className={cn(
          'w-full max-w-full overflow-hidden rounded-2xl border border-border',
          'bg-card p-3 sm:rounded-3xl sm:p-4 lg:max-h-[calc(100dvh-2rem)]',
          'lg:w-80 lg:overflow-y-auto'
        )}
      >
        <AttemptsFiltersContent idPrefix="desktop" {...props} />
      </div>
    </aside>
  );
}

function compareSelectedFirst<T>(
  firstItem: T,
  secondItem: T,
  selectedTokens: ReadonlySet<string>,
  getToken: (item: T) => string,
  getLabel: (item: T) => string
): number {
  const firstSelected = selectedTokens.has(getToken(firstItem));
  const secondSelected = selectedTokens.has(getToken(secondItem));

  if (firstSelected !== secondSelected) {
    return firstSelected ? -1 : 1;
  }

  return getLabel(firstItem).localeCompare(getLabel(secondItem));
}

function AttemptsFiltersHeader({
  attemptsCount,
  loading,
}: {
  attemptsCount: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p
          className={cn(
            'flex items-center gap-2 text-sm font-semibold tracking-wide',
            'text-muted-foreground uppercase'
          )}
        >
          <Filter className="size-4" /> Фильтры
        </p>
      </div>
      {loading ? (
        <span
          className="h-7 w-24 animate-pulse rounded-full bg-muted"
          aria-label="Загрузка количества попыток"
        />
      ) : (
        <span
          className={cn(
            'rounded-full bg-secondary px-3 py-1 text-sm font-medium'
          )}
        >
          Попыток: {attemptsCount}
        </span>
      )}
    </div>
  );
}

type AttemptsFiltersVariant = 'sidebar' | 'drawer';

type FilterSectionContext = {
  idPrefix: string;
  loading: boolean;
  filterActionsDisabled: boolean;
  variant: AttemptsFiltersVariant;
  tasks: CourseAttempt['task'][];
  students: CourseAttempt['student'][];
};

function TasksFilterSection({
  context,
  search,
  tasks,
  selectedTaskIds,
  onSearchChange,
  onSelectedTaskIdsChange,
}: {
  context: FilterSectionContext;
  search: string;
  tasks: CourseAttempt['task'][];
  selectedTaskIds: string[];
  onSearchChange: (search: string) => void;
  onSelectedTaskIdsChange: (taskIds: string[]) => void;
}) {
  const { idPrefix, loading, filterActionsDisabled, variant } = context;

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`${idPrefix}-tasks-filter-heading`}
          className="text-sm font-semibold"
        >
          Задания
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={filterActionsDisabled || selectedTaskIds.length === 0}
          onClick={() => onSelectedTaskIdsChange([])}
        >
          Сбросить
        </Button>
      </div>
      <FilterMultiSelect
        id={`${idPrefix}-task-filter`}
        labelId={`${idPrefix}-tasks-filter-heading`}
        search={search}
        placeholder="Найти задание"
        emptyMessage="Задания не найдены"
        options={tasks.map((task) => ({
          value: task.id,
          label: `${task.title} · ${task.maxScore} б.`,
        }))}
        selectedOptions={context.tasks
          .filter((task) => selectedTaskIds.includes(task.id))
          .map((task) => ({
            value: task.id,
            label: `${task.title} · ${task.maxScore} б.`,
          }))}
        selectedValues={selectedTaskIds}
        loading={loading}
        listClassName={
          variant === 'drawer' ? 'max-h-[clamp(8rem,24dvh,12rem)]' : 'max-h-56'
        }
        onSearchChange={onSearchChange}
        onSelectedValuesChange={onSelectedTaskIdsChange}
      />
    </section>
  );
}

function StudentsFilterSection({
  context,
  search,
  students,
  selectedStudentUsernames,
  onSearchChange,
  onSelectedStudentUsernamesChange,
}: {
  context: FilterSectionContext;
  search: string;
  students: CourseAttempt['student'][];
  selectedStudentUsernames: string[];
  onSearchChange: (search: string) => void;
  onSelectedStudentUsernamesChange: (studentUsernames: string[]) => void;
}) {
  const { idPrefix, loading, filterActionsDisabled, variant } = context;

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`${idPrefix}-students-filter-heading`}
          className="text-sm font-semibold"
        >
          Студенты
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={
            filterActionsDisabled || selectedStudentUsernames.length === 0
          }
          onClick={() => onSelectedStudentUsernamesChange([])}
        >
          Сбросить
        </Button>
      </div>
      <FilterMultiSelect
        id={`${idPrefix}-student-filter`}
        labelId={`${idPrefix}-students-filter-heading`}
        search={search}
        placeholder="ФИО или username"
        emptyMessage="Студенты не найдены"
        options={students.map((student) => ({
          value: student.username,
          label: `${student.fullName} · ${student.group}`,
        }))}
        selectedOptions={context.students
          .filter((student) =>
            selectedStudentUsernames.includes(student.username)
          )
          .map((student) => ({
            value: student.username,
            label: `${student.fullName} · ${student.group}`,
          }))}
        selectedValues={selectedStudentUsernames}
        loading={loading}
        listClassName={
          variant === 'drawer' ? 'max-h-[clamp(8rem,24dvh,12rem)]' : 'max-h-56'
        }
        onSearchChange={onSearchChange}
        onSelectedValuesChange={onSelectedStudentUsernamesChange}
      />
    </section>
  );
}

function GradedFilterSection({
  graded,
  onGradedChange,
}: {
  graded: CourseAttemptGradedFilter;
  onGradedChange: (graded: CourseAttemptGradedFilter) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold">Оценена</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {GRADED_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onGradedChange(option.value)}
            className={cn(
              'cursor-pointer rounded-md border px-3 py-2 text-sm font-medium',
              'transition-colors hover:bg-accent focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:outline-none',
              graded === option.value
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border bg-background'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function AttemptsFiltersActions({
  applyDisabled,
  resetDisabled,
  filterActionsDisabledReason,
  variant,
  onApply,
  onReset,
}: {
  applyDisabled: boolean;
  resetDisabled: boolean;
  filterActionsDisabledReason?: string;
  variant: AttemptsFiltersVariant;
  onApply: () => void;
  onReset: () => void;
}) {
  const isDrawer = variant === 'drawer';

  return (
    <TooltipProvider>
      <div
        className={cn(
          'mt-6 grid grid-cols-2 gap-2',
          isDrawer &&
            'sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95' +
              'px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur' +
              'supports-[backdrop-filter]:bg-background/80'
        )}
      >
        {filterActionsDisabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex w-full">
                <Button type="button" disabled className="w-full">
                  Применить
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{filterActionsDisabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            type="button"
            disabled={applyDisabled}
            onClick={onApply}
            className="w-full"
          >
            Применить
          </Button>
        )}
        {filterActionsDisabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex w-full">
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="w-full"
                >
                  Сбросить
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{filterActionsDisabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={resetDisabled}
            onClick={onReset}
            className="w-full"
          >
            Сбросить
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

type AttemptsFiltersPanel = {
  appliedFilters: CourseAttemptsFilters;
  draftFilters: CourseAttemptsFilters;
  attemptsCount: number;
  loading: boolean;
  tasks: CourseAttempt['task'][];
  students: CourseAttempt['student'][];
  filterActionsDisabledReason?: string;
  onDraftFiltersChange: (filters: CourseAttemptsFilters) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
};

type AttemptsFiltersContentProps = {
  idPrefix: string;
  panel: AttemptsFiltersPanel;
  onAfterApply?: () => void;
  onAfterReset?: () => void;
  showHeader?: boolean;
  variant?: AttemptsFiltersVariant;
};
