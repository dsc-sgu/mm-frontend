import { http, HttpResponse } from 'msw';
import { resolveStudentAccess } from '@/app/mock-backend/participant-access';

// Working wire contract pending #113. Denials contain no resource/owner data.
export const repositoryHandlers = [
  http.get(
    '/api/v1/courses/:courseId/repositories/:studentUsername',
    ({ params }) => {
      const result = resolveStudentAccess(
        String(params.courseId),
        String(params.studentUsername)
      );
      switch (result.status) {
        case 'unauthenticated':
          return new HttpResponse(null, { status: 401 });
        case 'not-found':
          return HttpResponse.json({ status: 'not-found' }, { status: 404 });
        case 'forbidden':
          return HttpResponse.json({ status: 'forbidden' }, { status: 403 });
        case 'found':
          return HttpResponse.json({
            status: 'found',
            repository: { studentId: result.studentId },
          });
      }
    }
  ),
];
