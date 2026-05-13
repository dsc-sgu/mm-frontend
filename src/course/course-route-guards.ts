import { SESSION_OPTIONS } from '@/auth/auth.queries';
import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import type { CourseRole } from './course-access.types';
import { courseAccessOptions } from './course-access.queries';

async function requireAuthenticatedUsername(queryClient: QueryClient) {
  const session = await queryClient.ensureQueryData(SESSION_OPTIONS);
  if (session.status === 'NOT_AUTHORIZED') {
    throw redirect({ to: '/login' });
  }

  return session.session.username;
}

// TODO: `participant` currently means either a student or a teacher. Replace this
// with a more precise model once students, teams, and teachers are represented by
// the backend course access API.
export async function requireCourseParticipant({
  queryClient,
  courseSlug,
}: {
  queryClient: QueryClient;
  courseSlug: string;
}) {
  const username = await requireAuthenticatedUsername(queryClient);
  const access = await queryClient.ensureQueryData(
    courseAccessOptions({ courseSlug, username })
  );

  if (access.status !== 'allowed') {
    throw redirect({ to: '/' });
  }

  return access;
}

export async function requireCourseRole({
  queryClient,
  courseSlug,
  role,
  redirectTo = '/courses/$courseSlug',
}: {
  queryClient: QueryClient;
  courseSlug: string;
  role: CourseRole | CourseRole[];
  redirectTo?: '/courses/$courseSlug' | '/courses/$courseSlug/repositories';
}) {
  const access = await requireCourseParticipant({ queryClient, courseSlug });
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(access.role)) {
    throw redirect({
      to: redirectTo,
      params: { courseSlug },
    });
  }

  return access;
}

export function requireKnownCourseStudent({
  courseSlug,
  access,
  studentUsername,
  redirectTo = '/courses/$courseSlug',
}: {
  courseSlug: string;
  access: { studentUsernames: string[] };
  studentUsername: string;
  redirectTo?: '/courses/$courseSlug' | '/courses/$courseSlug/repositories';
}) {
  if (!access.studentUsernames.includes(studentUsername)) {
    throw redirect({
      to: redirectTo,
      params: { courseSlug },
    });
  }
}
