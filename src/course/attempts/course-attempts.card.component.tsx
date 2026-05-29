import { Eye, FileCheck2 } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import {
  normalizeScoreDraftInput,
  scoreDraftChanged,
  scoreDraftTextSizeClass,
  scoreDraftValidationError,
} from './course-attempts.grading';
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
  const isDefaultMode = props.mode === 'default';
  const selected = isDefaultMode ? props.selected : false;
  const draftScoreChanged =
    props.mode === 'quick-grading'
      ? scoreDraftChanged(attempt, props.draftScore)
      : false;
  const draftScoreError =
    props.mode === 'quick-grading'
      ? scoreDraftValidationError(attempt, props.draftScore)
      : null;
  const draftScoreErrorId = `attempt-${attempt.id}-score-error`;

  return (
    <article
      className={cn(
        'rounded-2xl border bg-card px-6 py-5 transition-colors sm:px-7 sm:py-6',
        selected ? 'border-primary ring-2 ring-primary/15' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center">
          <div
            className={cn(
              'grid shrink-0 place-items-center overflow-hidden transition-[width,opacity,margin] duration-200 ease-out',
              isDefaultMode ? 'mr-2 w-5 opacity-100' : 'mr-0 w-0 opacity-0'
            )}
            aria-hidden={!isDefaultMode}
          >
            <Checkbox
              checked={selected}
              disabled={!isDefaultMode}
              tabIndex={isDefaultMode ? undefined : -1}
              onCheckedChange={(value) => {
                if (props.mode === 'default') {
                  props.onSelectedChange(value === true);
                }
              }}
              aria-label={`Выбрать попытку ${attempt.task.title}`}
              className="size-5 rounded-md transition-opacity duration-200"
            />
          </div>
          <h3 className="text-xl font-semibold leading-tight tracking-tight transition-transform duration-200 ease-out">
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
            <Input
              type="text"
              inputMode="decimal"
              min={0}
              max={attempt.task.maxScore}
              step={1}
              value={props.draftScore}
              disabled={Boolean(attempt.reviewLock)}
              aria-invalid={Boolean(draftScoreError)}
              aria-describedby={draftScoreError ? draftScoreErrorId : undefined}
              onChange={(event) => {
                const nextDraftScore = normalizeScoreDraftInput(
                  event.target.value
                );

                if (nextDraftScore !== null) {
                  props.onDraftScoreChange(nextDraftScore);
                }
              }}
              placeholder="—"
              className={cn(
                'h-12 w-24 rounded-xl px-2 text-center font-semibold transition-colors',
                scoreDraftTextSizeClass(props.draftScore),
                draftScoreChanged &&
                  'border-orange-400 bg-orange-50 text-orange-950 focus-visible:border-orange-500 focus-visible:ring-orange-400/35 dark:border-orange-500/70 dark:bg-orange-950/35 dark:text-orange-100 dark:focus-visible:border-orange-400 dark:focus-visible:ring-orange-400/30',
                draftScoreError &&
                  'border-destructive bg-destructive/10 text-destructive focus-visible:border-destructive focus-visible:ring-destructive/30 dark:bg-destructive/20'
              )}
            />
            <span className="text-xl font-semibold text-muted-foreground">
              / {attempt.task.maxScore}
            </span>
            {draftScoreError ? (
              <span
                id={draftScoreErrorId}
                className="whitespace-nowrap text-sm font-medium text-destructive"
              >
                {draftScoreError}
              </span>
            ) : null}
          </label>
        )}
      </div>
    </article>
  );
}
