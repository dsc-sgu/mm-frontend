import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UserRefSchema } from '@/features/auth/model/user-ref';
import { GradeSchema } from '@/features/course/model/grade';
import {
  AttemptIdSchema,
  AttemptNumberSchema,
  TaskIdSchema,
  type CourseId,
} from '@/features/course/model/identity';
import { normalizeCourseAttemptsFilters } from '@/features/course/features/attempts/model/filters';

const Timestamp = v.pipe(v.string(), v.isoTimestamp());

const Task = v.object({
  id: TaskIdSchema,
  title: v.string(),
  maxGrade: GradeSchema,
});

const ResponseSchema = v.object({
  totalAttemptsCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  tasks: v.array(Task),
  students: v.array(UserRefSchema),
  attempts: v.array(
    v.object({
      id: AttemptIdSchema,
      attemptNumber: AttemptNumberSchema,
      task: Task,
      student: UserRefSchema,
      submittedAt: Timestamp,
      deadlineAt: Timestamp,
      grade: v.nullable(
        v.object({
          value: GradeSchema,
          gradedAt: Timestamp,
          gradedBy: UserRefSchema,
        })
      ),
      reviewLock: v.nullable(
        v.object({ teacher: UserRefSchema, lockedAt: Timestamp })
      ),
    })
  ),
});

export type LoadCourseAttemptsInput = {
  courseId: CourseId;
  filters: ReturnType<typeof normalizeCourseAttemptsFilters>;
};

export function loadCourseAttempts(
  { courseId, filters }: LoadCourseAttemptsInput,
  signal?: AbortSignal
) {
  const normalized = normalizeCourseAttemptsFilters(filters);
  const url = new URL(
    apiPath('courses', courseId, 'attempts'),
    location.origin
  );

  url.searchParams.set('tasks', normalized.tasks.join(','));
  url.searchParams.set('students', normalized.students.join(','));
  url.searchParams.set('status', normalized.graded);

  return runHttpOperation(
    {
      name: 'load-course-attempts',
      url: url.toString(),
      credentials: 'include',
      signal,
    },
    async (context) => {
      if (context.response.status !== 200) {
        throw unexpectedHttpStatus(context);
      }
      return readJson(context, ResponseSchema);
    }
  );
}
