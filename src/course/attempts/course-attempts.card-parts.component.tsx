import { LockKeyhole } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import {
  formatDateTime,
  getGroupLabel,
  getTimingLabel,
} from './course-attempts.format';
import type { CourseAttempt } from './course-attempts.types';

export function AttemptTitle({ attempt }: { attempt: CourseAttempt }) {
  return (
    <>
      <span className="font-semibold">Попытка #{attempt.attemptNumber}: </span>
      <span className="font-normal">{attempt.task.title}</span>
    </>
  );
}

export function AttemptDiffStats({ attempt }: { attempt: CourseAttempt }) {
  return (
    <div className="flex shrink-0 items-center gap-3 text-sm font-medium">
      <span className="text-emerald-700 dark:text-emerald-300">
        +{attempt.diff.addedLines}
      </span>
      <span className="text-rose-700 dark:text-rose-300">
        −{attempt.diff.deletedLines}
      </span>
    </div>
  );
}

export function AttemptDetails({ attempt }: { attempt: CourseAttempt }) {
  const timing = getTimingLabel(attempt);

  return (
    <div className="mt-1 text-base leading-7 text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">
          {attempt.student.fullName}
        </span>{' '}
        <span className="ml-3">Группа «{getGroupLabel(attempt)}»</span>
      </p>
      <p>
        Отправлено {formatDateTime(attempt.submittedAt)}{' '}
        <span className={cn('font-semibold', timing.className)}>
          {timing.label}
        </span>
      </p>
      {attempt.grade ? (
        <p className="text-foreground">
          Оценено {formatDateTime(attempt.grade.gradedAt)} преподавателем{' '}
          {attempt.grade.gradedBy} ({attempt.grade.score}/
          {attempt.grade.maxScore})
        </p>
      ) : (
        <p className="font-semibold text-orange-600 dark:text-orange-300">
          Не оценено
        </p>
      )}
      {attempt.reviewLock ? (
        <p className="inline-flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
          <LockKeyhole className="size-4" /> На проверке у{' '}
          {attempt.reviewLock.teacherName}
        </p>
      ) : null}
    </div>
  );
}
