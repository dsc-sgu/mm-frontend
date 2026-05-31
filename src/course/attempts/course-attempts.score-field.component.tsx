import { useId } from 'react';

import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import {
  normalizeScoreDraftInput,
  scoreDraftTextSizeClass,
} from './course-attempts.grading';

interface CourseAttemptsScoreFieldProps {
  value: string;
  maxScore: number;
  changed?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  error?: string | null;
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
}

export function CourseAttemptsScoreField({
  value,
  maxScore,
  changed = false,
  disabled = false,
  ariaLabel = 'Балл',
  error = null,
  className,
  inputClassName,
  onChange,
}: CourseAttemptsScoreFieldProps) {
  const generatedErrorId = useId();
  const errorId = `${generatedErrorId}-score-error`;

  return (
    <label className={cn('grid min-h-12 min-w-0 gap-y-1', className)}>
      <span className="flex min-w-0 items-center gap-3">
        <Input
          type="text"
          inputMode="decimal"
          min={0}
          max={maxScore}
          step={1}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            const nextDraftScore = normalizeScoreDraftInput(event.target.value);

            if (nextDraftScore !== null) {
              onChange(nextDraftScore);
            }
          }}
          placeholder="—"
          className={cn(
            'h-12 w-24 rounded-xl px-2 text-center font-semibold transition-colors',
            scoreDraftTextSizeClass(value),
            changed &&
              'border-orange-400 bg-orange-50 text-orange-950 focus-visible:border-orange-500 focus-visible:ring-orange-400/35 dark:border-orange-500/70 dark:bg-orange-950/35 dark:text-orange-100 dark:focus-visible:border-orange-400 dark:focus-visible:ring-orange-400/30',
            error &&
              'border-destructive bg-destructive/10 text-destructive focus-visible:border-destructive focus-visible:ring-destructive/30 dark:bg-destructive/20',
            inputClassName
          )}
        />
        <span className="shrink-0 text-xl font-semibold text-muted-foreground">
          / {maxScore}
        </span>
      </span>
      {error ? (
        <span
          id={errorId}
          className="max-w-full break-words text-sm font-medium leading-snug text-destructive"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
