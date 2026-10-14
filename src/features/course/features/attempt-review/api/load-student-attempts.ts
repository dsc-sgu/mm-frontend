import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import type { UserId } from '@/features/auth/model/identity';
import { GradeSchema } from '@/features/course/model/grade';
import {
  AttemptIdSchema,
  AttemptNumberSchema,
  type CourseId,
} from '@/features/course/model/identity';
import { ReviewRevisionSchema } from '@/features/course/features/review/model/revision';
import type { StudentAttempt } from '@/features/course/features/attempt-review/model/types';

const CountSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

// Working wire contract pending backend confirmation #113: a Grade travels
// with the number of the Review Revision that published it.
const StudentAttemptsSchema = v.object({
  attempts: v.array(
    v.object({
      id: AttemptIdSchema,
      attemptNumber: AttemptNumberSchema,
      submittedAt: v.pipe(v.string(), v.isoTimestamp()),
      review: v.nullable(
        v.object({ revision: ReviewRevisionSchema, grade: GradeSchema })
      ),
      addedLines: CountSchema,
      deletedLines: CountSchema,
      commentCount: CountSchema,
    })
  ),
});

/** The Student's Attempts at the Task, newest first. */
export function loadStudentAttempts(
  courseId: CourseId,
  taskId: string,
  studentId: UserId,
  signal?: AbortSignal
): Promise<StudentAttempt[]> {
  return runHttpOperation(
    {
      name: 'load-student-attempts',
      url: apiPath(
        'courses',
        courseId,
        'tasks',
        taskId,
        'students',
        studentId,
        'attempts'
      ),
      credentials: 'include',
      signal,
    },
    async (context) => {
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      const { attempts } = await readJson(context, StudentAttemptsSchema);
      return attempts;
    }
  );
}
