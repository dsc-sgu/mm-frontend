import { AlertCircle } from 'lucide-react';

import type { CourseRole } from '@/features/course/features/access/model/types';
import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

const PAGE_CLASS_NAME = cn(
  'mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-7',
  'lg:px-8 lg:py-9'
);

export function TaskPageLoading({ role }: { role: CourseRole }) {
  return (
    <main
      className={PAGE_CLASS_NAME}
      aria-busy="true"
      aria-label="Загрузка задания"
    >
      <div className="animate-pulse rounded-3xl border bg-card px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="h-10 w-3/5 max-w-md rounded-xl bg-muted" />
        <div className="mt-6 h-5 max-w-3xl rounded-full bg-muted" />
        <div className="mt-3 h-5 max-w-2xl rounded-full bg-muted" />
        <div className="mt-5 h-4 w-64 rounded-full bg-muted" />

        <div className="mt-6 border-t pt-5">
          <div className="h-4 w-44 rounded-full bg-muted" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, index) => (
              <div key={index} className="h-[70px] rounded-2xl bg-muted" />
            ))}
          </div>
        </div>

        {role === 'teacher' ? (
          <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row">
            <div className="h-10 rounded-xl bg-muted sm:w-64" />
            <div className="h-10 rounded-xl bg-muted sm:w-52" />
          </div>
        ) : null}
      </div>

      {role === 'student' ? (
        <div className="mt-7 sm:mt-9">
          <div className="h-9 w-64 animate-pulse rounded-xl bg-muted" />
          <div className="mt-5 divide-y overflow-hidden rounded-2xl border bg-card">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-[84px] animate-pulse bg-muted/60" />
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

export function TaskPageNotFound() {
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

export function TaskPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <div className="rounded-3xl border border-dashed bg-card px-6 py-14">
        <AlertCircle
          className="mx-auto size-8 text-destructive"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Не удалось загрузить задание
        </h1>
        <p className="mt-2 text-muted-foreground">
          Проверьте соединение и попробуйте ещё раз.
        </p>
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Повторить
        </Button>
      </div>
    </main>
  );
}
