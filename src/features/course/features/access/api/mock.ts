import { http, HttpResponse } from 'msw';
import * as v from 'valibot';
import { mockBackend } from '@/app/mock-backend/state';
import {
  CourseIdSchema,
  CourseSlugSchema,
} from '@/features/course/model/identity';

// Working wire assumption pending backend confirmation (#113):
// https://github.com/dsc-sgu/mm-frontend/issues/113
// GET by locator resolves UUID as CourseId, otherwise a non-UUID CourseSlug.
// Both access denials use 404 with a validated discriminator, but no metadata.
// An unauthenticated request returns 401, an undeclared operation failure.
export const courseContextHandlers = [
  http.get('/api/v1/courses/:locator', ({ params }) => {
    const { users, session, courses, memberships } = mockBackend.state;
    if (!session || !users.some((user) => user.id === session.userId)) {
      return new HttpResponse(null, { status: 401 });
    }

    const parsedId = v.safeParse(CourseIdSchema, params.locator);
    const courseId = parsedId.success ? parsedId.output.toLowerCase() : null;
    const slug = parsedId.success
      ? null
      : v.safeParse(CourseSlugSchema, params.locator);
    const course = parsedId.success
      ? courses.find((course) => course.id.toLowerCase() === courseId)
      : slug?.success
        ? courses.find((course) => course.slug === slug.output)
        : undefined;
    if (!course) {
      return HttpResponse.json({ status: 'course-not-found' }, { status: 404 });
    }
    const membership = memberships.find(
      ({ courseId, userId }) =>
        courseId === course.id && userId === session.userId
    );
    if (!membership) {
      return HttpResponse.json({ status: 'not-member' }, { status: 404 });
    }

    const { id, title, shortTitle, iconName, color } = course;
    return HttpResponse.json({
      status: 'found',
      course: { id, title, shortTitle, iconName, color },
      role: membership.role,
    });
  }),
];
