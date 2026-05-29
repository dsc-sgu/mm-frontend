import { Eye, FileCheck2 } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { cn } from '@/shadcn/lib/utils';
import { scoreDraftChanged } from './course-attempts.grading';
import {
  getAttemptDiffHref,
  getAttemptReviewHref,
} from './course-attempts.navigation';
import { CourseAttemptsScoreField } from './course-attempts.score-field.component';
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
          <CourseAttemptsScoreField
            value={props.draftScore}
            maxScore={attempt.task.maxScore}
            changed={draftScoreChanged}
            disabled={Boolean(attempt.reviewLock)}
            ariaLabel={`Балл за попытку ${attempt.task.title}`}
            onChange={props.onDraftScoreChange}
          />
        )}
      </div>
    </article>
  );
}
