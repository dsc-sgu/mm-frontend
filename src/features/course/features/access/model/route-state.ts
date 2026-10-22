export type CourseAccessOutcome =
  | 'course-not-found'
  | 'role-mismatch'
  | 'resource-not-found'
  | 'operation-failed';

export type CourseAccessRouteState =
  | 'course-not-found'
  | 'forbidden'
  | 'resource-not-found'
  | 'check-failed';

export function courseAccessRouteState(
  outcome: CourseAccessOutcome
): CourseAccessRouteState {
  switch (outcome) {
    case 'course-not-found':
      return 'course-not-found';
    case 'role-mismatch':
      return 'forbidden';
    case 'resource-not-found':
      return 'resource-not-found';
    case 'operation-failed':
      return 'check-failed';
  }
}
