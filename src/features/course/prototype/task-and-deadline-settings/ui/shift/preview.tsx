// PROTOTYPE (#181): «Что изменится» in the shift and extension windows: one
// line per changed value, grouped by Task, in a block of fixed height so the
// window does not grow while the Teacher is choosing.
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export function ChangesBox({
  empty,
  children,
}: {
  /** Shown instead of the lines while there is nothing to show. */
  empty: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="h-32 overflow-y-auto rounded-md border bg-muted/30 px-3 py-2 text-sm">
      {empty !== null ? (
        <p className="grid h-full place-items-center text-center text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid gap-2">{children}</div>
      )}
    </div>
  );
}

export function ChangesTask({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <span className="truncate text-xs text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

/** Whose value it is on the left, what happens to it on the right. */
export function ChangeLine({
  who,
  note,
  children,
}: {
  who: ReactNode;
  /** A muted word after `who`: a Student Group, «получит свой». */
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <span className="min-w-0 truncate">
        {who}
        {note ? (
          <span className="text-xs text-muted-foreground"> {note}</span>
        ) : null}
      </span>
      {children}
    </div>
  );
}

export function BeforeAfter({
  before,
  after,
  badge,
}: {
  before: string;
  after: string;
  /** Where the old value came from: «общий», «группа», «личное». */
  badge?: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className="text-muted-foreground">{before}</span>
      {badge}
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="font-medium">{after}</span>
    </span>
  );
}

export function Unchanged({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground tabular-nums">{children}</span>;
}
