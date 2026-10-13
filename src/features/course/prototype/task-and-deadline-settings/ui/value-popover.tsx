// PROTOTYPE (#181): a value that opens its editor in a popover, as in
// Linear / Notion property rows and Airtable cells. Values not applied yet
// are tinted and can be reverted one by one (Vercel data editor).
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import { timeZoneLabel } from '@/features/course/prototype/task-and-deadline-settings/time';

const TRIGGER = {
  row: 'min-h-8 max-w-full rounded-md px-2 -mx-2 text-left whitespace-nowrap',
  cell: 'h-full min-h-10 w-full px-2.5 text-left',
  chip: 'h-7 rounded-full border px-2.5 text-xs whitespace-nowrap',
} as const;

export function ValuePopover({
  trigger,
  title,
  pending = false,
  onRevert,
  variant = 'row',
  disabled = false,
  showZone = true,
  className,
  children,
}: {
  trigger: ReactNode;
  title: string;
  pending?: boolean;
  onRevert?: () => void;
  variant?: keyof typeof TRIGGER;
  disabled?: boolean;
  showZone?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'group/value relative flex min-w-0 items-center',
        variant === 'cell' && 'h-full'
      )}
    >
      <Popover>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            className={cn(
              'inline-flex min-w-0 items-center gap-1.5 text-sm transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-default',
              !disabled && 'hover:bg-muted',
              TRIGGER[variant],
              pending && 'bg-amber-500/10 shadow-[inset_2px_0_0_#f59e0b]',
              className
            )}
          >
            {trigger}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <p className="border-b px-3 py-2 text-sm font-medium">{title}</p>
          <div className="grid gap-3 p-3">{children}</div>
          {showZone ? (
            <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              Время в поясе {timeZoneLabel()}
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
      {pending && onRevert ? (
        <button
          type="button"
          title="Вернуть применённое значение"
          aria-label="Вернуть применённое значение"
          onClick={onRevert}
          className={cn(
            'ml-0.5 grid size-6 shrink-0 place-items-center rounded text-muted-foreground',
            'opacity-0 group-hover/value:opacity-100 hover:bg-muted hover:text-foreground',
            'focus-visible:opacity-100'
          )}
        >
          <RotateCcw className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
