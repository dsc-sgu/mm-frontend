// PROTOTYPE (#181): label + value row, as the property lists of Linear,
// Twenty and Asana task panels.
import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';

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
        'grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-x-3',
        className
      )}
    >
      <span className="flex min-h-8 items-center gap-1.5 text-sm text-muted-foreground">
        {label}
        {locked ? (
          <span title="Меняется, только пока курс в подготовке">
            <Lock className="size-3 shrink-0" aria-hidden="true" />
          </span>
        ) : null}
      </span>
      <div className="grid min-w-0 gap-1">
        <div className="flex min-h-8 min-w-0 items-center">{children}</div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {!error && note ? note : null}
      </div>
    </div>
  );
}

/** A quiet sentence-case heading between groups of rows. */
export function RowsHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
      <h3 className="text-sm font-medium">{children}</h3>
      {action}
    </div>
  );
}
