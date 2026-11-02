import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { CourseIdSchema } from '@/features/course/model/identity';
import { CourseColorSchema } from '@/features/course/model/types';
import type { DeadlinesByDay } from '@/features/deadlines-calendar/model/types';

const DeadlineDtoSchema = v.object({
  id: v.string(),
  courseId: CourseIdSchema,
  taskId: v.string(),
  courseShortTitle: v.string(),
  taskText: v.string(),
  dueDate: v.pipe(v.string(), v.isoTimestamp()),
  courseColor: CourseColorSchema,
});

// Working frontend contract pending backend confirmation (mm-113).
// Only 200 (including []) is declared; authentication/HTTP failures reject.
export function loadDeadlines(
  start: Date,
  end: Date,
  signal?: AbortSignal
): Promise<DeadlinesByDay> {
  const url = new URL(apiPath('deadlines'), location.origin);
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());

  return runHttpOperation(
    { name: 'load-deadlines', url, signal },
    async (context) => {
      if (context.response.status !== 200) {
        throw unexpectedHttpStatus(context);
      }

      const deadlines = await readJson(context, v.array(DeadlineDtoSchema));

      const days: DeadlinesByDay = {};
      for (const dto of deadlines) {
        const dueDate = new Date(dto.dueDate);
        const key = dueDate.toLocaleDateString('ru-RU');
        (days[key] ??= []).push({ ...dto, dueDate });
      }

      return days;
    }
  );
}
