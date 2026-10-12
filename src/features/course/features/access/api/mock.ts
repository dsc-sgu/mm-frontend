import { http, HttpResponse } from 'msw';
import { mockBackend } from '@/app/mock-backend/state';

// Working wire assumption pending backend confirmation (#113):
// https://github.com/dsc-sgu/mm-frontend/issues/113
// GET by slug returns 200 { status: 'found', course: shell metadata, role }.
// Both access denials use 404 with a validated discriminator, but no metadata.
// An unauthenticated request returns 401, an undeclared operation failure.
export const courseContextHandlers = [
  http.get('/api/v1/courses/by-slug/:courseSlug', ({ params }) => {
    const { users, session, courses, memberships } = mockBackend.state;
    if (!session || !users.some((user) => user.id === session.userId)) {
      return new HttpResponse(null, { status: 401 });
    }

    const course = courses.find(({ slug }) => slug === params.courseSlug);
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
