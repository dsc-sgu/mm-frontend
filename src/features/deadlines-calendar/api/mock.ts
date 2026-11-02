import { http, HttpResponse } from 'msw';
import { mockBackend } from '@/app/mock-backend/state';

export const deadlinesHandlers = [
  http.get('/api/v1/deadlines', ({ request }) => {
    const { session, users, memberships, courses, tasks } = mockBackend.state;
    if (!session || !users.some(({ id }) => id === session.userId)) {
      return new HttpResponse(null, { status: 401 });
    }

    const url = new URL(request.url);
    const start = Date.parse(url.searchParams.get('start') ?? '');
    const end = Date.parse(url.searchParams.get('end') ?? '');
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      return new HttpResponse(null, { status: 400 });
    }

    const courseIds = new Set(
      memberships
        .filter(({ userId }) => userId === session.userId)
        .map(({ courseId }) => courseId)
    );

    return HttpResponse.json(
      tasks.flatMap((task) => {
        const course = courses.find(({ id }) => id === task.courseId);
        const due = Date.parse(task.deadlineAt);
        if (!course || !courseIds.has(course.id) || due < start || due > end) {
          return [];
        }

        return [
          {
            id: `${course.id}:${task.id}`,
            courseId: course.id,
            taskId: task.id,
            courseShortTitle: course.shortTitle,
            taskText: task.title,
            dueDate: task.deadlineAt,
            courseColor: course.color,
          },
        ];
      })
    );
  }),
];
