import { WorkerPoolContext } from '@pierre/diffs/react';
import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/shadcn/components/ui/button';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import type { DiffReadiness } from '@/features/course/features/attempt-review/model/diff-readiness';

type DiffReadinessGateProps = {
  readiness: DiffReadiness;
  className?: string;
  onRetry: () => void;
  children: ReactNode;
};

/** Shows the diff once its Workers are ready, or their failure with a retry. */
export function DiffReadinessGate({
  readiness,
  className,
  onRetry,
  children,
}: DiffReadinessGateProps) {
  switch (readiness.status) {
    case 'loading':
      return (
        <div
          role="status"
          className={cn(
            'grid place-items-center p-6 text-muted-foreground',
            className
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Spinner /> Загружаем изменения…
          </span>
        </div>
      );
    case 'failed':
      return (
        <div className={cn('grid place-items-center p-6', className)}>
          <section
            role="alert"
            aria-labelledby="attempt-review-diff-failed-title"
            className="max-w-md rounded-2xl border border-dashed p-6 text-center"
          >
            <AlertCircle
              className="mx-auto size-8 text-destructive"
              aria-hidden="true"
            />
            <h2
              id="attempt-review-diff-failed-title"
              className="mt-3 text-lg font-semibold"
            >
              Не удалось показать изменения
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Браузер не смог запустить просмотр кода. Оценку и общий отзыв
              можно продолжать писать.
            </p>
            <Button variant="outline" className="mt-4" onClick={onRetry}>
              Повторить
            </Button>
          </section>
        </div>
      );
    case 'ready':
      return (
        <WorkerPoolContext value={readiness.pool.manager}>
          {children}
        </WorkerPoolContext>
      );
  }
}
