// PROTOTYPE (#181): small segmented switch for prototype controls.
import { cn } from '@/shadcn/lib/utils';

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'sm',
  disabled,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; title?: string }>;
  onChange: (value: T) => void;
  size?: 'xs' | 'sm';
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full flex-wrap rounded-md border border-border',
        'bg-muted/50 p-0.5',
        disabled && 'opacity-60'
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.title}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-[5px] font-medium whitespace-nowrap transition-colors',
            size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
            option.value === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
            'disabled:cursor-not-allowed'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
