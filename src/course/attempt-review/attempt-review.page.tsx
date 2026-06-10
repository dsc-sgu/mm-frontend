import { Spinner } from '@/shadcn/components/ui/spinner';
import { AttemptReviewPageContent } from './attempt-review-page-content.component';
import { useAttemptReviewQuery } from './attempt-review.queries';
import { useAttemptReviewWorkerPoolReady } from './attempt-review-worker-pool.hook';
import type { AttemptReviewMode } from './attempt-review.types';

interface AttemptReviewPageProps {
  mode: AttemptReviewMode;
  courseSlug: string;
  taskId: string;
  studentUsername: string;
  attemptId: number;
}

export function AttemptReviewPage(props: AttemptReviewPageProps) {
  const reviewQuery = useAttemptReviewQuery(props);
  const isWorkerPoolReady = useAttemptReviewWorkerPoolReady();

  if (reviewQuery.isLoading || !isWorkerPoolReady) {
    return (
      <main className="mx-auto grid min-h-[60vh] w-full max-w-7xl place-items-center p-6">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Spinner /> Загружаем страницу проверки…
        </div>
      </main>
    );
  }

  if (reviewQuery.isError || !reviewQuery.data) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <section className="rounded-2xl border bg-card p-6">
          <h1 className="text-xl font-semibold">Не удалось открыть попытку</h1>
          <p className="mt-2 text-muted-foreground">
            Проверьте параметры маршрута или попробуйте обновить страницу.
          </p>
        </section>
      </main>
    );
  }

  return (
    <AttemptReviewPageContent
      key={`${props.courseSlug}:${props.taskId}:${props.studentUsername}:${props.attemptId}`}
      {...props}
      review={reviewQuery.data}
    />
  );
}
