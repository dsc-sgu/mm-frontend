// PROTOTYPE (#181): label + value row, as the property lists of Linear,
// Twenty and Asana task panels. Every row is at least 32 px tall and the
// label column is the same everywhere, so values line up in one column.
import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';

/** Label column plus the gap; nested content aligns with the values. */
export const VALUE_INDENT = 'ml-[8.75rem]';

export function PropertyRow({
  label,
  locked = false,
  error,
  note,
  children,
  className,
}: {
  label: ReactNode;
  locked?: boolean;
  error?: string | null;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-x-3',
        className
      )}
    >
      <span className="flex min-h-8 min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <span className="truncate">{label}</span>
        {locked ? (
          <span title="Меняется, только пока курс в подготовке">
            <Lock
              className="size-3 shrink-0 text-muted-foreground/60"
              aria-hidden="true"
            />
          </span>
        ) : null}
      </span>
      <div className="grid min-w-0">
        <div className="flex min-h-8 min-w-0 items-center">{children}</div>
        {error ? (
          <p className="pb-1 text-xs text-destructive">{error}</p>
        ) : null}
        {/* A note may render nothing; then it takes no room. */}
        {!error && note ? (
          <div className="pb-1 empty:hidden">{note}</div>
        ) : null}
      </div>
    </div>
  );
}

/** A small caption between groups of rows inside one section. */
export function RowsHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mt-3 flex h-7 items-center justify-between gap-2 first:mt-0">
      <h4 className="text-xs font-medium text-muted-foreground">{children}</h4>
      {action}
    </div>
  );
}
