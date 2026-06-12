import { useId } from 'react';
import { cva } from 'class-variance-authority';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import { normalizeScoreDraftInput } from '@/features/course/features/grading/model/grading';

type CourseScoreFieldProps = {
  value: string;
  maxScore: number;
  changed?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  error?: string | null;
  resetAriaLabel?: string;
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
  onReset?: () => void;
};

const scoreFieldInputVariants = cva(
  [
    'h-12 w-24 rounded-xl px-2',
    'text-center font-semibold',
    'transition-colors',
  ],
  {
    variants: {
      state: {
        default: '',
        changed: [
          'border-orange-400 bg-orange-50 text-orange-950',
          'focus-visible:border-orange-500 focus-visible:ring-orange-400/35',
          'dark:border-orange-500/70 dark:bg-orange-950/35',
          'dark:text-orange-100',
          'dark:focus-visible:border-orange-400',
          'dark:focus-visible:ring-orange-400/30',
        ],
        error: [
          'border-destructive bg-destructive/10 text-destructive',
          'focus-visible:border-destructive',
          'focus-visible:ring-destructive/30',
          'dark:bg-destructive/20',
        ],
      },
      size: {
        default: 'text-xl md:text-xl',
        compact: 'text-lg md:text-lg',
        dense: 'text-base md:text-base',
        overflow: 'text-sm md:text-sm',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'default',
    },
  }
);

function getScoreDraftTextSize(
  value: string
): 'default' | 'compact' | 'dense' | 'overflow' {
  if (value.length <= 4) {
    return 'default';
  }

  if (value.length <= 6) {
    return 'compact';
  }

  if (value.length <= 8) {
    return 'dense';
  }

  return 'overflow';
}

export function CourseScoreField({
  value,
  maxScore,
  changed = false,
  disabled = false,
  ariaLabel = 'Балл',
  error = null,
  resetAriaLabel = 'Вернуть прежний балл',
  className,
  inputClassName,
  onChange,
  onReset,
}: CourseScoreFieldProps) {
  const generatedErrorId = useId();
  const errorId = `${generatedErrorId}-score-error`;

  return (
    <div className={cn('grid min-h-12 min-w-0 gap-y-1', className)}>
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
            scoreFieldInputVariants({
              state: error ? 'error' : changed ? 'changed' : 'default',
              size: getScoreDraftTextSize(value),
            }),
            inputClassName
          )}
        />
        <span className="shrink-0 text-xl font-semibold text-muted-foreground">
          / {maxScore}
        </span>
        {onReset ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={resetAriaLabel}
            title={resetAriaLabel}
            onClick={onReset}
            className="rounded-xl text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-4" />
          </Button>
        ) : null}
      </span>
      {error ? (
        <span
          id={errorId}
          className="max-w-full text-sm leading-snug font-medium break-words text-destructive"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

export { CourseScoreField as CourseAttemptsScoreField };
