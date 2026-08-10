import { useTaskPageQuery } from '@/features/course/features/task/api/queries';
import type { TaskPageData } from '@/features/course/features/task/model/types';
import { TaskAttachments } from '@/features/course/features/task/ui/attachments';
import { TaskAttemptHistory } from '@/features/course/features/task/ui/attempt-history';
import { TaskDetails } from '@/features/course/features/task/ui/details';
import {
  TaskPageError,
  TaskPageLoading,
  TaskPageNotFound,
} from '@/features/course/features/task/ui/page-states';
import { cn } from '@/shadcn/lib/utils';

export function CourseTaskPage({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}) {
  const taskPageQuery = useTaskPageQuery({ courseSlug, taskId });

  if (taskPageQuery.isPending) {
    return <TaskPageLoading />;
  }

  if (taskPageQuery.isError) {
    return <TaskPageError onRetry={() => void taskPageQuery.refetch()} />;
  }

  if (!taskPageQuery.data) {
    return <TaskPageNotFound />;
  }

  return <TaskPageContent data={taskPageQuery.data} />;
}

function TaskPageContent({ data }: { data: TaskPageData }) {
  const { courseSlug, task } = data;

  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-6xl flex-col px-3 py-5 sm:px-6 sm:py-7',
        'lg:px-8 lg:py-9'
      )}
    >
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
          <TaskDetails
            number={task.number}
            title={task.title}
            description={task.description}
            deadlineAt={task.deadlineAt}
          />
          <TaskAttachments
            attachments={task.attachments}
            courseSlug={courseSlug}
          />
        </div>
      </section>

      <TaskAttemptHistory
        attempts={task.attempts}
        courseSlug={courseSlug}
        deadlineAt={task.deadlineAt}
        maxScore={task.maxScore}
        taskId={task.id}
      />
    </main>
  );
}
