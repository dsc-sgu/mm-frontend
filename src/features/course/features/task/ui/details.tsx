import { CalendarClock } from 'lucide-react';

import { formatTaskDateTime } from '@/features/course/features/task/model/deadline';
import type { Task } from '@/features/course/features/task/model/types';
import { cn } from '@/shadcn/lib/utils';

type TaskDetailsProps = Pick<
  Task,
  'number' | 'title' | 'description' | 'deadlineAt'
>;

export function TaskDetails({
  number,
  title,
  description,
  deadlineAt,
}: TaskDetailsProps) {
  return (
    <header>
      <h1
        className={cn(
          'max-w-4xl text-2xl leading-tight font-bold tracking-tight',
          'text-foreground sm:text-3xl lg:text-4xl'
        )}
      >
        Задание №{number} — {title}
      </h1>

      <p
        className={cn(
          'mt-4 max-w-3xl text-base leading-7 text-foreground/80',
          'sm:text-lg sm:leading-8'
        )}
      >
        {description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <CalendarClock
          className="size-4 text-rose-600 dark:text-rose-300"
          aria-hidden="true"
        />
        <span className="font-semibold text-rose-700 dark:text-rose-300">
          Дедлайн:
        </span>
        <time dateTime={deadlineAt} className="font-semibold">
          {formatTaskDateTime(deadlineAt)}
        </time>
      </div>
    </header>
  );
}
