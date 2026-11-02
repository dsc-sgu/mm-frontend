import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from '@/shadcn/components/ui/button';

export function CoursePageLoadError({
  isRetrying,
  onRetry,
}: {
  isRetrying: boolean;
  onRetry: () => Promise<unknown>;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <div className="rounded-3xl border border-dashed bg-card px-6 py-14">
        <div role="alert">
          <AlertCircle
            className="mx-auto size-8 text-destructive"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Не удалось загрузить страницу
          </h1>
          <p className="mt-2 text-muted-foreground">
            Попробуйте загрузить материалы курса ещё раз.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          disabled={isRetrying}
          onClick={() => void onRetry()}
        >
          {isRetrying && (
            <LoaderCircle
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {isRetrying ? 'Загружаем…' : 'Повторить'}
        </Button>
        {isRetrying && (
          <span
            role="status"
            aria-label="Повторная загрузка страницы"
            className="sr-only"
          >
            Загружаем…
          </span>
        )}
      </div>
    </main>
  );
}
