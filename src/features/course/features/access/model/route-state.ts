export type CourseAccessOutcome =
  | 'course-not-found'
  | 'not-member'
  | 'role-mismatch'
  | 'resource-not-found'
  | 'resource-forbidden'
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
    case 'not-member':
      return 'course-not-found';
    case 'role-mismatch':
      return 'forbidden';
    case 'resource-not-found':
    case 'resource-forbidden':
      return 'resource-not-found';
    case 'operation-failed':
      return 'check-failed';
  }
}
