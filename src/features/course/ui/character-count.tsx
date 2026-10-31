import { cn } from '@/shadcn/lib/utils';

type CharacterCountProps = {
  id: string;
  length: number;
  max: number;
};

export function CharacterCount({ id, length, max }: CharacterCountProps) {
  const progress = Math.min(1, Math.max(0, length / max));
  return (
    <span
      id={id}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-xs font-normal tabular-nums',
        'text-muted-foreground',
        length >= max && 'text-destructive',
        length < max && progress >= 0.8 && 'text-amber-600 dark:text-amber-400'
      )}
    >
      {length}/{max}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          strokeWidth="2"
          className="stroke-border"
        />
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 * (1 - progress)}
        />
      </svg>
    </span>
  );
}
