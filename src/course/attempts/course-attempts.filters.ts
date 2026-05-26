import type {
  CourseAttemptGradedFilter,
  CourseAttemptsFilters,
  CourseAttemptsRouteSearch,
} from './course-attempts.types';

const TOKEN_RE = /^[a-zA-Z0-9_-]+$/;

export const EMPTY_COURSE_ATTEMPTS_FILTERS: CourseAttemptsFilters = {
  tasks: [],
  students: [],
  graded: 'any',
};

function normalizeTokenList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(',') : value;

  if (typeof raw !== 'string') {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && TOKEN_RE.test(item))
    )
  ).sort((a, b) => a.localeCompare(b));
}

function normalizeGraded(value: unknown): CourseAttemptGradedFilter {
  return value === 'yes' || value === 'no' ? value : 'any';
}

export function normalizeCourseAttemptsFilters(
  filters: Partial<CourseAttemptsFilters>
): CourseAttemptsFilters {
  return {
    tasks: normalizeTokenList(filters.tasks),
    students: normalizeTokenList(filters.students),
    graded: normalizeGraded(filters.graded),
  };
}

export function validateCourseAttemptsSearch(
  search: Record<string, unknown>
): CourseAttemptsRouteSearch {
  const tasks = normalizeTokenList(search.tasks);
  const students = normalizeTokenList(search.students);
  const graded = normalizeGraded(search.graded);

  return {
    ...(tasks.length > 0 ? { tasks: tasks.join(',') } : {}),
    ...(students.length > 0 ? { students: students.join(',') } : {}),
    ...(graded !== 'any' ? { graded } : {}),
  };
}

export function filtersFromCourseAttemptsSearch(
  search: CourseAttemptsRouteSearch
): CourseAttemptsFilters {
  return {
    tasks: normalizeTokenList(search.tasks),
    students: normalizeTokenList(search.students),
    graded: normalizeGraded(search.graded),
  };
}

export function searchFromCourseAttemptsFilters(
  filters: CourseAttemptsFilters
): CourseAttemptsRouteSearch {
  const normalized = normalizeCourseAttemptsFilters(filters);

  return {
    ...(normalized.tasks.length > 0
      ? { tasks: normalized.tasks.join(',') }
      : {}),
    ...(normalized.students.length > 0
      ? { students: normalized.students.join(',') }
      : {}),
    ...(normalized.graded !== 'any' ? { graded: normalized.graded } : {}),
  };
}

export function areCourseAttemptsFiltersEqual(
  first: CourseAttemptsFilters,
  second: CourseAttemptsFilters
): boolean {
  const left = normalizeCourseAttemptsFilters(first);
  const right = normalizeCourseAttemptsFilters(second);

  return (
    left.graded === right.graded &&
    left.tasks.join('|') === right.tasks.join('|') &&
    left.students.join('|') === right.students.join('|')
  );
}
