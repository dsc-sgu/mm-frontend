import { useState } from 'react';
import { Filter, Search } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import {
  areCourseAttemptsFiltersEqual,
  EMPTY_COURSE_ATTEMPTS_FILTERS,
} from './course-attempts.filters';
import type {
  CourseAttempt,
  CourseAttemptGradedFilter,
  CourseAttemptsFilters,
} from './course-attempts.types';

const GRADED_FILTER_OPTIONS: Array<{
  value: CourseAttemptGradedFilter;
  label: string;
}> = [
  { value: 'any', label: 'Неважно' },
  { value: 'no', label: 'Нет' },
  { value: 'yes', label: 'Да' },
];

function toggleToken(tokens: string[], token: string): string[] {
  return tokens.includes(token)
    ? tokens.filter((item) => item !== token)
    : [...tokens, token].sort((a, b) => a.localeCompare(b));
}

function compareSelectedFirst<T>(
  firstItem: T,
  secondItem: T,
  selectedTokens: string[],
  getToken: (item: T) => string,
  getLabel: (item: T) => string
): number {
  const firstSelected = selectedTokens.includes(getToken(firstItem));
  const secondSelected = selectedTokens.includes(getToken(secondItem));

  if (firstSelected !== secondSelected) {
    return firstSelected ? -1 : 1;
  }

  return getLabel(firstItem).localeCompare(getLabel(secondItem));
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
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
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
      <span className="truncate">{label}</span>
    </label>
  );
}

export function AttemptsFilterSidebar({
  appliedFilters,
  draftFilters,
  attemptsCount,
  tasks,
  students,
  onDraftFiltersChange,
  onApplyFilters,
  onResetFilters,
}: {
  appliedFilters: CourseAttemptsFilters;
  draftFilters: CourseAttemptsFilters;
  attemptsCount: number;
  tasks: CourseAttempt['task'][];
  students: CourseAttempt['student'][];
  onDraftFiltersChange: (filters: CourseAttemptsFilters) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}) {
  const [taskSearch, setTaskSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const applyDisabled = areCourseAttemptsFiltersEqual(
    draftFilters,
    appliedFilters
  );
  const resetDisabled =
    areCourseAttemptsFiltersEqual(
      draftFilters,
      EMPTY_COURSE_ATTEMPTS_FILTERS
    ) &&
    areCourseAttemptsFiltersEqual(
      appliedFilters,
      EMPTY_COURSE_ATTEMPTS_FILTERS
    ) &&
    taskSearch.trim() === '' &&
    studentSearch.trim() === '';
  const visibleTasks = tasks
    .filter((task) =>
      task.title.toLowerCase().includes(taskSearch.toLowerCase().trim())
    )
    .sort((firstTask, secondTask) =>
      compareSelectedFirst(
        firstTask,
        secondTask,
        appliedFilters.tasks,
        (task) => task.id,
        (task) => task.title
      )
    );
  const visibleStudents = students
    .filter((student) =>
      `${student.fullName} ${student.username}`
        .toLowerCase()
        .includes(studentSearch.toLowerCase().trim())
    )
    .sort((firstStudent, secondStudent) =>
      compareSelectedFirst(
        firstStudent,
        secondStudent,
        appliedFilters.students,
        (student) => student.username,
        (student) => student.fullName
      )
    );

  function applyFilters() {
    onApplyFilters();
    setTaskSearch('');
    setStudentSearch('');
  }

  function resetFilters() {
    onDraftFiltersChange(EMPTY_COURSE_ATTEMPTS_FILTERS);
    onResetFilters();
    setTaskSearch('');
    setStudentSearch('');
  }

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-3xl border border-border bg-card p-4 lg:max-h-[calc(100dvh-2rem)] lg:w-80 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Filter className="size-4" /> Фильтры
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
            {attemptsCount}
          </span>
        </div>

        <div className="mt-5 space-y-6">
          <section>
            <h3 className="text-sm font-semibold">Задания</h3>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={taskSearch}
                onChange={(event) => setTaskSearch(event.target.value)}
                placeholder="Найти задание"
                className="pl-9"
              />
            </div>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
              {visibleTasks.map((task) => (
                <FilterOption
                  key={task.id}
                  id={`task-filter-${task.id}`}
                  label={`${task.title} · ${task.maxScore} б.`}
                  checked={draftFilters.tasks.includes(task.id)}
                  onCheckedChange={() =>
                    onDraftFiltersChange({
                      ...draftFilters,
                      tasks: toggleToken(draftFilters.tasks, task.id),
                    })
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Студенты</h3>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="ФИО или username"
                className="pl-9"
              />
            </div>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
              {visibleStudents.map((student) => (
                <FilterOption
                  key={student.username}
                  id={`student-filter-${student.username}`}
                  label={`${student.fullName} · ${student.group}`}
                  checked={draftFilters.students.includes(student.username)}
                  onCheckedChange={() =>
                    onDraftFiltersChange({
                      ...draftFilters,
                      students: toggleToken(
                        draftFilters.students,
                        student.username
                      ),
                    })
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Оценена</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {GRADED_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onDraftFiltersChange({
                      ...draftFilters,
                      graded: option.value,
                    })
                  }
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    draftFilters.graded === option.value
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border-border bg-background'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button type="button" disabled={applyDisabled} onClick={applyFilters}>
            Применить
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={resetDisabled}
            onClick={resetFilters}
          >
            Сбросить
          </Button>
        </div>
      </div>
    </aside>
  );
}
