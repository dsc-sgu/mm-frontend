import { useMemo, useState } from 'react';
import { Filter, Search } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { Input } from '@/shadcn/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { cn } from '@/shadcn/lib/utils';
import {
  areCourseAttemptsFiltersEqual,
  EMPTY_COURSE_ATTEMPTS_FILTERS,
} from './model/filters';
import type {
  CourseAttempt,
  CourseAttemptGradedFilter,
  CourseAttemptsFilters,
} from './model/types';

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
      <div className="w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card p-3 sm:rounded-3xl sm:p-4 lg:max-h-[calc(100dvh-2rem)] lg:w-80 lg:overflow-y-auto">
        <AttemptsFiltersContent idPrefix="desktop" {...props} />
      </div>
    </aside>
  );
}

function toggleToken(tokens: string[], token: string): string[] {
  return tokens.includes(token)
    ? tokens.filter((item) => item !== token)
    : [...tokens, token].sort((a, b) => a.localeCompare(b));
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

function FilterOptionsSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="space-y-1" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => {
        const width = index % 3 === 0 ? 78 : index % 3 === 1 ? 92 : 64;

        return (
          <div
            key={index}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
            <div
              className="h-5 animate-pulse rounded bg-muted"
              style={{ width: `${width}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function FilterOption({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-w-0 select-none cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => {
          if (value !== 'indeterminate') {
            onCheckedChange();
          }
        }}
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
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
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="size-4" /> Фильтры
        </p>
      </div>
      {loading ? (
        <span
          className="h-7 w-24 animate-pulse rounded-full bg-muted"
          aria-label="Загрузка количества попыток"
        />
      ) : (
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
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
        <h3 className="text-sm font-semibold">Задания</h3>
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
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Найти задание"
          className="pl-9"
        />
      </div>
      <div
        className={cn(
          'mt-2 space-y-1 pr-1',
          variant === 'drawer'
            ? 'max-h-[clamp(1rem,11dvh,12rem)] overflow-y-auto'
            : 'max-h-44 overflow-y-auto'
        )}
      >
        {loading ? (
          <FilterOptionsSkeleton />
        ) : (
          tasks.map((task) => (
            <FilterOption
              key={task.id}
              id={`${idPrefix}-task-filter-${task.id}`}
              label={`${task.title} · ${task.maxScore} б.`}
              checked={selectedTaskIds.includes(task.id)}
              onCheckedChange={() =>
                onSelectedTaskIdsChange(toggleToken(selectedTaskIds, task.id))
              }
            />
          ))
        )}
      </div>
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
        <h3 className="text-sm font-semibold">Студенты</h3>
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
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="ФИО или username"
          className="pl-9"
        />
      </div>
      <div
        className={cn(
          'mt-2 space-y-1 pr-1',
          variant === 'drawer'
            ? 'max-h-[clamp(1rem,11dvh,12rem)] overflow-y-auto'
            : 'max-h-48 overflow-y-auto'
        )}
      >
        {loading ? (
          <FilterOptionsSkeleton />
        ) : (
          students.map((student) => (
            <FilterOption
              key={student.username}
              id={`${idPrefix}-student-filter-${student.username}`}
              label={`${student.fullName} · ${student.group}`}
              checked={selectedStudentUsernames.includes(student.username)}
              onCheckedChange={() =>
                onSelectedStudentUsernamesChange(
                  toggleToken(selectedStudentUsernames, student.username)
                )
              }
            />
          ))
        )}
      </div>
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
              'cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
            'sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80'
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
