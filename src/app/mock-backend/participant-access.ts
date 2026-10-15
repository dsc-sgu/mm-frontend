import { HttpResponse } from 'msw';
import { mockBackend, type MockUser } from './state';

const DENIAL_STATUSES = {
  unauthenticated: 401,
  'not-found': 404,
  forbidden: 403,
};

/** A denial without a body: nothing of the resource or its owner leaks. */
export function accessDenial(status: keyof typeof DENIAL_STATUSES) {
  return new HttpResponse(null, { status: DENIAL_STATUSES[status] });
}

/** Backend-only authorization; the client never receives the Student roster. */
export function resolveStudentAccess(courseId: string, username: string) {
  return authorizeStudent(courseId, (user) => user.username === username);
}

/** The same authorization for a resource addressed by stable identities. */
export function resolveStudentIdAccess(courseId: string, studentId: string) {
  return authorizeStudent(courseId, (user) => user.id === studentId);
}

/** Resolves an Attempt of the Course visible to the signed-in User. */
export function resolveAttemptAccess(courseId: string, attemptId: string) {
  const attempt = mockBackend.state.attempts.find(
    (candidate) => candidate.id === attemptId && candidate.courseId === courseId
  );
  const result = authorizeStudent(
    courseId,
    (user) => user.id === attempt?.studentId
  );
  if (result.status !== 'found') return result;
  if (!attempt) return { status: 'not-found' } as const;
  return { status: 'found', attempt } as const;
}

function authorizeStudent(
  courseId: string,
  isStudent: (user: MockUser) => boolean
) {
  const { users, session, courses, memberships } = mockBackend.state;
  if (!session || !users.some(({ id }) => id === session.userId)) {
    return { status: 'unauthenticated' } as const;
  }
  const course = courses.find(({ id }) => id === courseId);
  if (!course) return { status: 'not-found' } as const;
  const viewer = memberships.find(
    (membership) =>
      membership.courseId === course.id && membership.userId === session.userId
  );
  if (!viewer) return { status: 'forbidden' } as const;
  const student = users.find(isStudent);
  if (
    !student ||
    !memberships.some(
      (membership) =>
        membership.courseId === course.id &&
        membership.userId === student.id &&
        membership.role === 'student'
    )
  )
    return { status: 'not-found' } as const;
  if (viewer.role !== 'teacher' && viewer.userId !== student.id) {
    return { status: 'forbidden' } as const;
  }
  return { status: 'found', studentId: student.id } as const;
}
