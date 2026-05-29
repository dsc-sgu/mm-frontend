import { Eye, FileCheck2 } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { cn } from '@/shadcn/lib/utils';
import {
  getAttemptDiffHref,
  getAttemptReviewHref,
} from './course-attempts.navigation';
import type { CourseAttempt } from './course-attempts.types';
import {
  AttemptDetails,
  AttemptDiffStats,
  AttemptTitle,
} from './course-attempts.card-parts.component';

export function AttemptCard({
  attempt,
  courseSlug,
  selected,
  onSelectedChange,
}: {
  attempt: CourseAttempt;
  courseSlug: string;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
}) {
  return (
    <article
      className={cn(
        'rounded-2xl border bg-card px-6 py-5 transition-colors sm:px-7 sm:py-6',
        selected ? 'border-primary ring-2 ring-primary/15' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelectedChange(value === true)}
            aria-label={`Выбрать попытку ${attempt.task.title}`}
            className="mt-1.5 size-5 rounded-md"
          />
          <h3 className="text-2xl font-semibold leading-tight tracking-tight">
            <button
              type="button"
              className="select-none text-left focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onSelectedChange(!selected)}
            >
              <AttemptTitle attempt={attempt} />
            </button>
          </h3>
        </div>
        <AttemptDiffStats attempt={attempt} />
      </div>

      <div className="min-w-0">
        <AttemptDetails attempt={attempt} />
      </div>

      <Button
        asChild
        variant="outline"
        className="mt-2 h-12 rounded-xl px-5 text-base font-semibold"
      >
        <a
          href={
            selected
              ? getAttemptDiffHref(courseSlug, attempt)
              : getAttemptReviewHref(courseSlug, attempt)
          }
        >
          {selected ? (
            <Eye className="size-4" />
          ) : (
            <FileCheck2 className="size-4" />
          )}
          {selected ? 'Посмотреть' : 'Оценить'}
        </a>
      </Button>
    </article>
  );
}
