import { http, HttpResponse } from 'msw';
import { mockBackend } from '@/app/mock-backend/state';
import type { CourseSummary } from '@/features/course/model/types';

// Working URL and array projection pending backend confirmation:
// https://github.com/dsc-sgu/mm-frontend/issues/113
// Only 200 is a declared Fetch My Courses outcome; unauthenticated requests
// receive 401, which the operation treats as an HTTP failure.
export const courseHandlers = [
  http.get('/api/v1/courses', () => {
    const { users, session, courses, memberships } = mockBackend.state;
    if (!session || !users.some((user) => user.id === session.userId)) {
      return new HttpResponse(null, { status: 401 });
    }

    const courseIds = new Set(
      memberships
        .filter((membership) => membership.userId === session.userId)
        .map((membership) => membership.courseId)
    );
    const summaries: CourseSummary[] = courses
      .filter((course) => courseIds.has(course.id))
      .map(({ id, slug, title, shortTitle, color, iconName, teachers }) => ({
        id,
        slug,
        title,
        shortTitle,
        color,
        iconName,
        teachers,
      }));

    return HttpResponse.json(summaries, { status: 200 });
  }),
];
