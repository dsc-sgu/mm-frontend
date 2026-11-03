import { gradeToNumber } from '@/features/course/model/grade';
import { http, HttpResponse } from 'msw';
import { mockBackend, mockUserName } from '@/app/mock-backend/state';
import type { CourseId } from '@/features/course/model/identity';
import type { CourseAttemptReviewLockUpdate } from '@/features/course/features/attempts/model/lock-updates';

export const courseAttemptsHandlers = [
  http.get('/api/v1/courses/:courseId/attempts', ({ params, request }) => {
    const state = mockBackend.state;
    if (!state.session) {
      return new HttpResponse(null, { status: 401 });
    }
    const course = state.courses.find(({ id }) => id === params.courseId);
    const membership = state.memberships.find(
      ({ courseId, userId }) =>
        courseId === course?.id && userId === state.session?.userId
    );
    if (!course || !membership) {
      return new HttpResponse(null, { status: 404 });
    }
    if (membership.role !== 'teacher') {
      return new HttpResponse(null, { status: 403 });
    }

    const ref = (id: string) => {
      const user = state.users.find((u) => u.id === id);
      if (!user) {
        throw new Error('Missing mock User');
      }
      return { id: user.id, username: user.username, ...mockUserName(user) };
    };

    const tasks = state.tasks
      .filter((t) => t.courseId === params.courseId)
      .map((t) => ({ ...t, maxGrade: gradeToNumber(t.maxGrade) }));
    const students = state.memberships
      .filter((m) => m.courseId === params.courseId && m.role === 'student')
      .map((m) => ref(m.userId));
    const all = state.attempts
      .filter((a) => a.courseId === params.courseId)
      .sort(
        (a, b) =>
          Date.parse(b.submittedAt) - Date.parse(a.submittedAt) ||
          a.id.localeCompare(b.id)
      )
      .map((a) => {
        const task = tasks.find((t) => t.id === a.taskId);
        if (!task) {
          throw new Error('Missing mock Task');
        }
        const review = state.reviews.find(
          (r) => r.attemptId === a.id
        )?.revision;
        return {
          ...a,
          task,
          student: ref(a.studentId),
          deadlineAt: task.deadlineAt,
          reviewLock: null,
          grade: review
            ? {
                value: gradeToNumber(review.grade),
                gradedAt: review.publishedAt,
                gradedBy: ref(review.publishedBy),
              }
            : null,
        };
      });
    const search = new URL(request.url).searchParams;
    const taskIds = search.get('tasks')?.split(',').filter(Boolean) ?? [];
    const studentIds = search.get('students')?.split(',').filter(Boolean) ?? [];
    const status = search.get('status') ?? 'any';
    return HttpResponse.json({
      tasks,
      students,
      totalAttemptsCount: all.length,
      attempts: all.filter(
        (a) =>
          (!taskIds.length || taskIds.includes(a.task.id)) &&
          (!studentIds.length || studentIds.includes(a.student.id)) &&
          (status === 'any' ||
            (status === 'graded' ? a.grade !== null : a.grade === null))
      ),
    });
  }),
];

export function createMockReviewLockUpdates(
  _courseId: CourseId
): CourseAttemptReviewLockUpdate[] {
  void _courseId;
  return [];
}
