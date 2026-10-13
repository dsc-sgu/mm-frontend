import { mockBackend } from './state';

/** Backend-only authorization; the client never receives the Student roster. */
export function resolveStudentAccess(courseId: string, username: string) {
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
  const student = users.find((user) => user.username === username);
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
