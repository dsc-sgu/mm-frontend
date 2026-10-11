import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { OperationFailure } from '@/app/remote-data/http';
import { Button } from '@/shadcn/components/ui/button';

/** Fallback for errors that reach the router, such as a failed session check. */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <div className="rounded-3xl border border-dashed bg-card px-6 py-14">
        <AlertCircle
          className="mx-auto size-8 text-destructive"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Не удалось загрузить страницу
        </h1>
        <p className="mt-2 text-muted-foreground">{routeFailureText(error)}</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => void router.invalidate()}
        >
          Повторить
        </Button>
      </div>
    </main>
  );
}

// `error.message` is an internal diagnostic and is never shown.
function routeFailureText(error: unknown) {
  if (!(error instanceof OperationFailure)) {
    return 'Произошла непредвиденная ошибка. Попробуйте ещё раз.';
  }

  return error.kind === 'network'
    ? 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.'
    : 'Сервер ответил не так, как ожидалось. Попробуйте ещё раз позже.';
}
