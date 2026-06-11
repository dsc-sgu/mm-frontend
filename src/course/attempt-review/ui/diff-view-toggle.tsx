import { SquareSplitHorizontal, SquareSplitVertical } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import type { AttemptReviewDiffViewMode } from '../model/types';

type AttemptReviewDiffViewToggleProps = {
  value: AttemptReviewDiffViewMode;
  onChange: (value: AttemptReviewDiffViewMode) => void;
};

export function AttemptReviewDiffViewToggle({
  value,
  onChange,
}: AttemptReviewDiffViewToggleProps) {
  return (
    <div
      className="inline-grid grid-cols-2 rounded-lg bg-muted/50 p-0.5 text-xs font-medium text-muted-foreground"
      aria-label="Режим отображения diff"
    >
      {(['unified', 'split'] as const).map((mode) => {
        const selected = value === mode;

        return (
          <button
            key={mode}
            type="button"
            className={cn(
              'h-9 cursor-pointer rounded-md px-3 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'bg-background text-foreground shadow-sm'
            )}
            aria-pressed={selected}
            onClick={() => onChange(mode)}
          >
            {mode === 'unified' ? (
              <SquareSplitVertical size={14} />
            ) : (
              <SquareSplitHorizontal size={14} />
            )}
          </button>
        );
      })}
    </div>
  );
}
