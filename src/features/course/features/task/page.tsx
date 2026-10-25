import { useQuery } from '@tanstack/react-query';

import type { Session } from '@/features/auth/model/types';
import type { CourseId } from '@/features/course/model/identity';
import type { CourseRole } from '@/features/course/features/access/model/types';
import {
  taskPageQueries,
  type attemptHistoryOptions,
} from '@/features/course/features/task/api/queries';
import type { TaskPageData } from '@/features/course/features/task/model/types';
import { TaskAttachments } from '@/features/course/features/task/ui/attachments';
import { TaskAttemptHistory } from '@/features/course/features/task/ui/attempt-history';
import { TaskDetails } from '@/features/course/features/task/ui/details';
import {
  AttemptHistoryError,
  AttemptHistoryLoading,
  TaskPageError,
  TaskPageLoading,
  TaskPageNotFound,
} from '@/features/course/features/task/ui/page-states';
import { TaskTeacherActions } from '@/features/course/features/task/ui/teacher-actions';
import { cn } from '@/shadcn/lib/utils';

type AttemptHistoryQuery = ReturnType<typeof attemptHistoryOptions>;

export function CourseTaskPage({
  courseId,
  courseSlug,
  taskId,
  role,
  viewer,
}: {
  courseId: CourseId;
  courseSlug: string;
  taskId: string;
  role: CourseRole;
  viewer: Session;
}) {
  // The route loader has already started these reads.
  const pageQueries = taskPageQueries({
    viewerId: viewer.userId,
    courseId,
    taskId,
    studentId: role === 'student' ? viewer.userId : null,
  });
  const taskQuery = useQuery(pageQueries.task);

  if (taskQuery.isPending) {
    return <TaskPageLoading role={role} />;
  }

  if (taskQuery.isError) {
    return <TaskPageError onRetry={() => void taskQuery.refetch()} />;
  }

  if (!taskQuery.data) {
    return <TaskPageNotFound />;
  }

  return (
    <TaskPageContent
      data={taskQuery.data}
      attemptHistory={pageQueries.attemptHistory}
      courseId={courseId}
      courseSlug={courseSlug}
      role={role}
      viewer={viewer}
    />
  );
}

function TaskPageContent({
  data: { task },
  attemptHistory,
  courseId,
  courseSlug,
  role,
  viewer,
}: {
  data: TaskPageData;
  attemptHistory: AttemptHistoryQuery | null;
  courseId: CourseId;
  courseSlug: string;
  role: CourseRole;
  viewer: Session;
}) {
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
          {role === 'teacher' ? (
            <TaskTeacherActions courseSlug={courseSlug} taskId={task.id} />
          ) : null}
        </div>
      </section>

      {attemptHistory ? (
        <StudentAttemptHistory
          query={attemptHistory}
          courseId={courseId}
          courseSlug={courseSlug}
          deadlineAt={task.deadlineAt}
          maxGrade={task.maxGrade}
          student={viewer}
          taskId={task.id}
        />
      ) : null}
    </main>
  );
}

function StudentAttemptHistory({
  query,
  ...props
}: { query: AttemptHistoryQuery } & Omit<
  Parameters<typeof TaskAttemptHistory>[0],
  'attempts'
>) {
  const historyQuery = useQuery(query);

  // A failed background refetch keeps the loaded history.
  if (historyQuery.isError && historyQuery.data === undefined) {
    return <AttemptHistoryError onRetry={() => void historyQuery.refetch()} />;
  }

  // A denied read is the Course shell's to show (see `useResourceDenial`).
  if (historyQuery.data?.status !== 'found') {
    return <AttemptHistoryLoading />;
  }

  return (
    <TaskAttemptHistory attempts={historyQuery.data.attempts} {...props} />
  );
}
