import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  jsonBody,
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UserIdSchema } from '@/features/auth/model/identity';
import { gradeToNumber, type Grade } from '@/features/course/model/grade';
import {
  AttemptIdSchema,
  TaskIdSchema,
  type CourseId,
} from '@/features/course/model/identity';

const SavedSchema = v.object({
  attemptId: AttemptIdSchema,
  taskId: TaskIdSchema,
  studentId: UserIdSchema,
});

/** Temporary grade-only publication; ATT6 supplies the full quick grading workflow. No automatic retry. */
export function saveQuickGrade(
  courseId: CourseId,
  attemptId: string,
  grade: Grade
) {
  return runHttpOperation(
    {
      name: 'save-quick-grade',
      url: apiPath(
        'courses',
        courseId,
        'attempts',
        attemptId,
        'review',
        'quick-grade'
      ),
      method: 'POST',
      credentials: 'include',
      ...jsonBody({ grade: gradeToNumber(grade) }),
    },
    async (context) => {
      if (context.response.status !== 200) {
        throw unexpectedHttpStatus(context);
      }
      return readJson(context, SavedSchema);
    }
  );
}
