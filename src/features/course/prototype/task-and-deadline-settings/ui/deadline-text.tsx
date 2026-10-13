// PROTOTYPE (#181): how a deadline value reads: explicit, inherited (pale),
// «без срока» (marked), and «было → стало».
import { ArrowRight, Ban, CornerDownRight } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import type {
  DeadlineSource,
  DeadlineValue,
  LevelValue,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  formatCompactMoment,
  formatMoment,
} from '@/features/course/prototype/task-and-deadline-settings/time';

export function NoDeadline({
  pale = false,
  className,
}: {
  pale?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-dashed px-1.5',
        'text-xs whitespace-nowrap',
        pale
          ? 'border-border text-muted-foreground/60'
          : 'border-muted-foreground/40 font-medium text-foreground/80',
        className
      )}
    >
      <Ban className="size-3" aria-hidden="true" />
      без срока
    </span>
  );
}

export function DeadlineText({
  value,
  inherited,
  compact = false,
  defaultTime = '23:59',
  className,
}: {
  value: LevelValue;
  inherited?: DeadlineValue;
  compact?: boolean;
  defaultTime?: string;
  className?: string;
}) {
  const format = (at: number) =>
    compact ? formatCompactMoment(at, defaultTime) : formatMoment(at);

  if (value.kind === 'none') {
    return <NoDeadline className={className} />;
  }

  if (value.kind === 'at') {
    return (
      <span
        className={cn(
          'font-medium whitespace-nowrap text-foreground tabular-nums',
          className
        )}
      >
        {format(value.at)}
      </span>
    );
  }

  if (!inherited) {
    return (
      <span className={cn('text-muted-foreground/70', className)}>
        наследует
      </span>
    );
  }

  return (
    <span
      title="Наследует общий срок"
      className={cn(
        'inline-flex items-center gap-0.5 whitespace-nowrap tabular-nums',
        'text-muted-foreground/60',
        className
      )}
    >
      <CornerDownRight className="size-3 shrink-0" aria-hidden="true" />
      {inherited.kind === 'at' ? format(inherited.at) : <NoDeadline pale />}
    </span>
  );
}

const SOURCE_LABEL: Record<DeadlineSource, string> = {
  student: 'личное',
  group: 'группа',
  task: 'общий',
};

const SOURCE_TONE: Record<DeadlineSource, string> = {
  student: 'bg-violet-500/15 text-violet-800 dark:text-violet-300',
  group: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  task: 'bg-muted text-muted-foreground',
};

export function SourceBadge({ source }: { source: DeadlineSource }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-px text-[11px] font-medium whitespace-nowrap',
        SOURCE_TONE[source]
      )}
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}

export function ValueChange({
  before,
  after,
  inheritedBefore,
  inheritedAfter,
  defaultTime,
}: {
  before: LevelValue;
  after: LevelValue;
  inheritedBefore?: DeadlineValue;
  inheritedAfter?: DeadlineValue;
  defaultTime?: string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="line-through decoration-muted-foreground/50">
        <DeadlineText
          value={before}
          inherited={inheritedBefore}
          compact
          defaultTime={defaultTime}
        />
      </span>
      <ArrowRight
        className="size-3.5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <DeadlineText
        value={after}
        inherited={inheritedAfter}
        compact
        defaultTime={defaultTime}
      />
    </span>
  );
}
