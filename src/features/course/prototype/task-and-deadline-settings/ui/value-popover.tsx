// PROTOTYPE (#181): a value that opens its editor in a popover, as in
// Linear / Notion property rows and Airtable cells. Values not applied yet
// are tinted and can be reverted one by one (Vercel data editor).
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';

const TRIGGER = {
  row: 'min-h-8 max-w-full rounded-md px-2 -mx-2 text-left whitespace-nowrap',
  cell: 'h-full min-h-10 w-full px-2.5 text-left',
  chip: 'h-7 rounded-full border px-2.5 text-xs whitespace-nowrap',
} as const;

/** Plain content of a popover; date editors bring their own sections. */
export function PopoverSection({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('grid gap-3 p-3', className)}>{children}</div>;
}

export function ValuePopover({
  trigger,
  context,
  title,
  pending = false,
  onRevert,
  variant = 'row',
  disabled = false,
  className,
  children,
}: {
  trigger: ReactNode;
  /** What the value belongs to, usually the Task, shown above the title. */
  context?: string;
  title: string;
  pending?: boolean;
  onRevert?: () => void;
  variant?: keyof typeof TRIGGER;
  disabled?: boolean;
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
        {/* Never taller than the room left on screen: the calendar is tall.
            The date editor sets the width for its layout. */}
        <PopoverContent
          align="start"
          className={cn(
            'max-h-(--radix-popover-content-available-height) w-80 overflow-y-auto p-0',
            'divide-y has-[[data-picker=split]]:w-136 has-[[data-picker=stack]]:w-72'
          )}
        >
          <div className="grid px-3 pt-2 pb-1.5">
            {context ? (
              <p className="truncate text-xs text-muted-foreground">
                {context}
              </p>
            ) : null}
            {/* The row is as tall as the button, so the header does not jump
                when an unapplied change makes «Сбросить» appear. */}
            <div className="flex h-7 items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {title}
              </p>
              {pending && onRevert ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Вернуть применённое значение"
                  onClick={onRevert}
                  className={cn(
                    '-mr-2 h-7 shrink-0 gap-1.5 px-2 text-xs',
                    'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <RotateCcw className="size-3.5" />
                  Сбросить
                </Button>
              ) : null}
            </div>
          </div>
          {children}
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
