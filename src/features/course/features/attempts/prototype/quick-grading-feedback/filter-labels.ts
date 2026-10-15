// PROTOTYPE (#121): human-readable applied filters, shared by the normal-mode
// filter bar and the locked quick-grading bar so both read the same.
import type {
  CourseAttemptGradedFilter,
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';

export type FilterKey = 'tasks' | 'students' | 'graded';

export type FilterChip = {
  key: FilterKey;
  label: string;
  value: string;
};

export const GRADED_OPTIONS: Array<{
  value: CourseAttemptGradedFilter;
  label: string;
}> = [
  { value: 'any', label: 'неважно' },
  { value: 'no', label: 'нет' },
  { value: 'yes', label: 'да' },
];

export function gradedLabel(graded: CourseAttemptGradedFilter) {
  return GRADED_OPTIONS.find((option) => option.value === graded)?.label ?? '';
}

export function taskTitles(
  ids: readonly string[],
  tasks: readonly CourseAttemptTask[]
) {
  return ids.map((id) => tasks.find((task) => task.id === id)?.title ?? id);
}

export function studentNames(
  usernames: readonly string[],
  students: readonly CourseAttemptStudent[]
) {
  return usernames.map(
    (username) =>
      students.find((student) => student.username === username)?.fullName ??
      username
  );
}

export function summarize(values: readonly string[]) {
  const [first, ...rest] = values;

  return rest.length > 0 ? `${first}, +${rest.length}` : (first ?? '');
}

export function appliedChips(
  filters: CourseAttemptsFilters,
  tasks: readonly CourseAttemptTask[],
  students: readonly CourseAttemptStudent[]
): FilterChip[] {
  return [
    ...(filters.tasks.length > 0
      ? [
          {
            key: 'tasks' as const,
            label: filters.tasks.length === 1 ? 'Задание' : 'Задания',
            value: summarize(taskTitles(filters.tasks, tasks)),
          },
        ]
      : []),
    ...(filters.students.length > 0
      ? [
          {
            key: 'students' as const,
            label: filters.students.length === 1 ? 'Студент' : 'Студенты',
            value: summarize(studentNames(filters.students, students)),
          },
        ]
      : []),
    ...(filters.graded !== 'any'
      ? [
          {
            key: 'graded' as const,
            label: 'Оценено',
            value: gradedLabel(filters.graded),
          },
        ]
      : []),
  ];
}
