import { Eye, FileCheck2 } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { Input } from '@/shadcn/components/ui/input';
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

type AttemptCardProps =
  | {
      mode: 'default';
      attempt: CourseAttempt;
      courseSlug: string;
      selected: boolean;
      onSelectedChange: (checked: boolean) => void;
    }
  | {
      mode: 'quick-grading';
      attempt: CourseAttempt;
      draftScore: string;
      onDraftScoreChange: (score: string) => void;
    };

export function AttemptCard(props: AttemptCardProps) {
  const { attempt } = props;
  const selected = props.mode === 'default' ? props.selected : false;

  return (
    <article
      className={cn(
        'rounded-2xl border bg-card px-6 py-5 transition-colors sm:px-7 sm:py-6',
        selected ? 'border-primary ring-2 ring-primary/15' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          {props.mode === 'default' ? (
            <Checkbox
              checked={props.selected}
              onCheckedChange={(value) =>
                props.onSelectedChange(value === true)
              }
              aria-label={`Выбрать попытку ${attempt.task.title}`}
              className="size-5 rounded-md"
            />
          ) : null}
          <h3 className="text-xl font-semibold leading-tight tracking-tight">
            {props.mode === 'default' ? (
              <button
                type="button"
                className="select-none text-left focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => props.onSelectedChange(!props.selected)}
              >
                <AttemptTitle attempt={attempt} />
              </button>
            ) : (
              <AttemptTitle attempt={attempt} />
            )}
          </h3>
        </div>
        <AttemptDiffStats attempt={attempt} />
      </div>

      <div className="min-w-0">
        <AttemptDetails attempt={attempt} />
      </div>

      <div className="mt-2 flex h-12 items-center">
        {props.mode === 'default' ? (
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-xl px-5 text-base font-semibold"
          >
            <a
              href={
                props.selected
                  ? getAttemptDiffHref(props.courseSlug, attempt)
                  : getAttemptReviewHref(props.courseSlug, attempt)
              }
            >
              {props.selected ? (
                <Eye className="size-4" />
              ) : (
                <FileCheck2 className="size-4" />
              )}
              {props.selected ? 'Посмотреть' : 'Оценить'}
            </a>
          </Button>
        ) : (
          <label className="flex h-12 items-center gap-3">
            {/*TODO: Добавить валидацию*/}
            <Input
              type="text"
              inputMode="decimal"
              min={0}
              max={attempt.task.maxScore}
              step={1}
              value={props.draftScore}
              disabled={Boolean(attempt.reviewLock)}
              onChange={(event) => props.onDraftScoreChange(event.target.value)}
              placeholder="—"
              className="h-12 w-20 rounded-xl text-center text-xl font-semibold md:text-xl"
            />
            <span className="text-xl font-semibold text-muted-foreground">
              / {attempt.task.maxScore}
            </span>
          </label>
        )}
      </div>
    </article>
  );
}
