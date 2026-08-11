import { Link } from '@tanstack/react-router';
import { ArrowRight, Pencil, UsersRound } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

export function TaskTeacherActions({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}) {
  return (
    <section
      aria-label="Действия преподавателя"
      className={cn(
        'mt-6 flex flex-col gap-3 border-t border-border pt-5',
        'sm:flex-row sm:flex-wrap'
      )}
    >
      <Button
        asChild
        size="lg"
        variant="outline"
        className="rounded-xl sm:min-w-64"
      >
        <Link
          to="/courses/$courseSlug/attempts"
          params={{ courseSlug }}
          search={{ tasks: taskId }}
        >
          <UsersRound className="size-4" aria-hidden="true" />
          Посмотреть попытки студентов
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>

      <Button asChild size="lg" variant="outline" className="rounded-xl">
        <Link
          to="/courses/$courseSlug/tasks/$taskId/edit"
          params={{ courseSlug, taskId }}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Редактировать задание
        </Link>
      </Button>
    </section>
  );
}
