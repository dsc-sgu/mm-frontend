import { gradeToNumber } from '@/features/course/model/grade';
import { http, HttpResponse } from 'msw';
import { mockBackend } from '@/app/mock-backend/state';
import { getPageDocument } from '@/app/mock-backend/page-documents';
export const pageDocumentHandlers = [
  http.get('/api/v1/courses/:courseId/page', ({ params }) => {
    const { session, users, courses, memberships } = mockBackend.state;
    if (!session || !users.some((u) => u.id === session.userId))
      return new HttpResponse(null, { status: 401 });
    const course = courses.find((c) => c.id === params.courseId);
    const member = memberships.find(
      (m) => m.courseId === course?.id && m.userId === session.userId
    );
    if (!course || !member) return new HttpResponse(null, { status: 404 });
    const { page, versions } = getPageDocument(course);
    const latest = new Map<string, (typeof versions)[number]>();
    for (const version of versions) {
      if (version.publication !== 'published') continue;
      if ((latest.get(version.id)?.version ?? 0) < version.version)
        latest.set(version.id, version);
    }
    const content = [...latest.values()]
      .filter((v) => !v.deleted)
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        ...(typeof v.block === 'object' && v.block !== null ? v.block : {}),
        id: v.id,
        version: v.version,
      }));
    return HttpResponse.json({
      ...page,
      courseId: course.id,
      slug: course.slug,
      role: member.role,
      teachers: course.teachers.flatMap((t) =>
        users
          .filter((u) => u.username === t.username)
          .map((u) => ({
            id: u.id,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            patronymic: u.patronymic,
          }))
      ),
      content,
      taskSummaries: page.taskSummaries
        .map((s) =>
          s.status === 'unavailable'
            ? s
            : { ...s, maxGrade: s.maxGrade && gradeToNumber(s.maxGrade) }
        )
        .map((s) =>
          s.status === 'unavailable' || member.role === 'student'
            ? s
            : { ...s, status: 'teacher' }
        ),
    });
  }),
];
