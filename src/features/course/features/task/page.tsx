import { History, Send } from 'lucide-react';

import { useCourseTaskPageQuery } from '@/features/course/features/task/api/queries';
import type { CourseTaskPage as CourseTaskPageModel } from '@/features/course/features/task/model/types';
import { TaskAttemptRow } from '@/features/course/features/task/ui/attempt-row';
import { TaskOverview } from '@/features/course/features/task/ui/overview';
import { cn } from '@/shadcn/lib/utils';

export function CourseTaskPage({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}) {
  const taskQuery = useCourseTaskPageQuery({ courseSlug, taskId });

  if (taskQuery.isPending) {
    return <CourseTaskPageLoading />;
  }

  if (!taskQuery.data) {
    return <CourseTaskPageNotFound />;
  }

  return <CourseTaskPageLoaded task={taskQuery.data} />;
}

function CourseTaskPageLoaded({ task }: { task: CourseTaskPageModel }) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-6xl flex-col px-3 py-5 sm:px-6 sm:py-7',
        'lg:px-8 lg:py-9'
      )}
    >
      <TaskOverview task={task} />

      <section className="mt-7 sm:mt-9" aria-labelledby="attempts-heading">
        <div className="mb-5 px-1">
          <h2
            id="attempts-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            <History
              className="size-5 text-muted-foreground sm:size-6"
              aria-hidden="true"
            />
            История попыток
          </h2>
        </div>

        {task.attempts.length > 0 ? (
          <div className="divide-y overflow-hidden rounded-2xl border bg-card sm:grid sm:grid-cols-[max-content_minmax(0,1fr)_minmax(0,1fr)_max-content]">
            {task.attempts.map((attempt) => (
              <TaskAttemptRow
                key={attempt.id}
                attempt={attempt}
                courseSlug={task.courseSlug}
                deadlineAt={task.deadlineAt}
                taskId={task.taskId}
              />
            ))}
          </div>
        ) : (
          <div
            className={cn(
              'rounded-3xl border border-dashed bg-card px-6 py-12 text-center',
              'sm:px-10'
            )}
          >
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Send className="size-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Попыток пока нет</h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              После отправки решения здесь появятся время, статус проверки и
              результат.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function CourseTaskPageLoading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9"
      aria-busy="true"
      aria-label="Загрузка задания"
    >
      <div className="animate-pulse rounded-3xl border bg-card px-5 py-8 sm:px-8 lg:px-10">
        <div className="h-7 w-32 rounded-full bg-muted" />
        <div className="mt-10 h-12 w-64 rounded-xl bg-muted sm:h-16 sm:w-96" />
        <div className="mt-6 h-5 max-w-3xl rounded-full bg-muted" />
        <div className="mt-3 h-5 max-w-2xl rounded-full bg-muted" />
        <div className="mt-10 grid gap-4 border-t pt-7 lg:grid-cols-3">
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="mt-9 space-y-4">
        <div className="h-10 w-52 animate-pulse rounded-xl bg-muted" />
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-64 animate-pulse rounded-3xl border bg-muted"
          />
        ))}
      </div>
    </main>
  );
}

function CourseTaskPageNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <div className="rounded-3xl border border-dashed bg-card px-6 py-14">
        <h1 className="text-2xl font-bold tracking-tight">
          Задание не найдено
        </h1>
        <p className="mt-2 text-muted-foreground">
          Возможно, оно было удалено или ссылка устарела.
        </p>
      </div>
    </main>
  );
}
