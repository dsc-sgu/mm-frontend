import { useId } from 'react';
import { cva } from 'class-variance-authority';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import {
  formatGrade,
  type Grade,
  type GradeInputError,
} from '@/features/course/model/grade';

type GradeFieldProps = {
  value: string;
  maxGrade: Grade;
  changed?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  error?: GradeInputError | null;
  resetAriaLabel?: string;
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
  onReset?: () => void;
};

const gradeFieldInputVariants = cva(
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

function getGradeErrorMessage(error: GradeInputError, maxGrade: Grade): string {
  switch (error) {
    case 'empty':
      return 'Введите оценку';
    case 'not-a-number':
      return 'Введите число, например 7,5';
    case 'too-precise':
      return 'Не больше трёх знаков после запятой';
    case 'above-max':
      return `Не больше ${formatGrade(maxGrade)}`;
  }
}

function getGradeInputTextSize(
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

export function GradeField({
  value,
  maxGrade,
  changed = false,
  disabled = false,
  ariaLabel = 'Оценка',
  error = null,
  resetAriaLabel = 'Вернуть прежнюю оценку',
  className,
  inputClassName,
  onChange,
  onReset,
}: GradeFieldProps) {
  const errorId = useId();

  return (
    <div className={cn('grid min-h-12 min-w-0 gap-y-1', className)}>
      <span className="flex min-w-0 items-center gap-3">
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          placeholder="—"
          className={cn(
            gradeFieldInputVariants({
              state: error ? 'error' : changed ? 'changed' : 'default',
              size: getGradeInputTextSize(value),
            }),
            inputClassName
          )}
        />
        <span className="shrink-0 text-xl font-semibold text-muted-foreground">
          / {formatGrade(maxGrade)}
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
          className={cn(
            'max-w-full text-sm leading-snug font-medium break-words',
            'text-destructive'
          )}
        >
          {getGradeErrorMessage(error, maxGrade)}
        </span>
      ) : null}
    </div>
  );
}
