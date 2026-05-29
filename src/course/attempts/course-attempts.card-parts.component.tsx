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
      <span className="font-normal break-words">{attempt.task.title}</span>
    </>
  );
}

export function AttemptDiffStats({ attempt }: { attempt: CourseAttempt }) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm">
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
    <div className="mt-1 min-w-0 break-words text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0">
        <span className="font-medium text-foreground">
          {attempt.student.fullName}
        </span>
        <span className="whitespace-nowrap">
          Группа «{getGroupLabel(attempt)}»
        </span>
      </p>
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span className="whitespace-nowrap">
          Отправлено {formatDateTime(attempt.submittedAt)}
        </span>
        <span
          className={cn(
            '-mt-0.5 whitespace-nowrap font-semibold sm:mt-0',
            timing.className
          )}
        >
          {timing.label}
        </span>
      </p>
      {attempt.grade ? (
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0 text-foreground">
          <span className="whitespace-nowrap">
            Оценено {formatDateTime(attempt.grade.gradedAt)}
          </span>
          <span className="-mt-0.5 whitespace-nowrap sm:mt-0">
            преподавателем {attempt.grade.gradedBy} ({attempt.grade.score}/
            {attempt.grade.maxScore})
          </span>
        </p>
      ) : (
        <p className="font-semibold text-orange-600 dark:text-orange-300">
          Не оценено
        </p>
      )}
      {attempt.reviewLock ? (
        <p className="inline-flex min-w-0 items-center gap-2 break-words font-medium text-amber-700 dark:text-amber-300">
          <LockKeyhole className="size-4" /> На проверке у{' '}
          {attempt.reviewLock.teacherName}
        </p>
      ) : null}
    </div>
  );
}
