import { http, HttpResponse } from 'msw';
import {
  accessDenial,
  resolveStudentAccess,
} from '@/app/mock-backend/participant-access';

// Working wire contract pending #113. Denials carry no body (ADR 0006).
export const repositoryHandlers = [
  http.get(
    '/api/v1/courses/:courseId/repositories/:studentUsername',
    ({ params }) => {
      const result = resolveStudentAccess(
        String(params.courseId),
        String(params.studentUsername)
      );
      if (result.status !== 'found') {
        return accessDenial(result.status);
      }
      return HttpResponse.json({
        status: 'found',
        repository: { studentId: result.studentId },
      });
    }
  ),
];
