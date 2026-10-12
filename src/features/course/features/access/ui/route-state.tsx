import { Link, useParams, useRouter } from '@tanstack/react-router';
import type { CourseAccessRouteState } from '@/features/course/features/access/model/route-state';
import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

export function CourseContextLoading() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p
        role="status"
        aria-label="Загрузка курса"
        className="text-muted-foreground"
      >
        Загрузка…
      </p>
    </main>
  );
}

export function CourseAccessState({
  state,
  courseSlug,
  onRetry,
}: {
  state: CourseAccessRouteState;
  courseSlug?: string;
  onRetry?: () => void;
}) {
  const failed = state === 'check-failed';
  const forbidden = state === 'forbidden';
  const insideCourse = state === 'resource-not-found' || forbidden;

  return (
    <main
      className={cn(
        'flex flex-1 flex-col items-center justify-center',
        'gap-4 p-6 text-center'
      )}
    >
      <h1 className="text-2xl font-semibold">
        {failed
          ? 'Не удалось проверить доступ'
          : forbidden
            ? 'Недостаточно прав'
            : 'Страница не найдена'}
      </h1>
      {!failed && !forbidden && (
        <p className="text-muted-foreground">
          Возможно, ссылка устарела или страница больше недоступна.
        </p>
      )}
      <div className="flex gap-3">
        {failed && onRetry && <Button onClick={onRetry}>Повторить</Button>}
        <Button asChild variant={failed ? 'outline' : 'default'}>
          {insideCourse && courseSlug ? (
            <Link to="/courses/$courseSlug" params={{ courseSlug }}>
              На страницу курса
            </Link>
          ) : (
            <Link to="/">К моим курсам</Link>
          )}
        </Button>
      </div>
    </main>
  );
}

export function CourseResourceNotFound() {
  const { courseSlug } = useParams({
    from: '/_authenticated/courses/$courseSlug',
  });
  return (
    <CourseAccessState state="resource-not-found" courseSlug={courseSlug} />
  );
}

export function CourseLookupFailure() {
  const router = useRouter();
  return (
    <CourseAccessState
      state="check-failed"
      onRetry={() => void router.invalidate()}
    />
  );
}
