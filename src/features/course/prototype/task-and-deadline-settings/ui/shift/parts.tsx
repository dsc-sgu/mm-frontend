// PROTOTYPE (#181): small pieces shared by the mass-shift windows.
import { useEffect, type ReactNode } from 'react';
import { ChevronDown, Minus, Plus, Undo2, X } from 'lucide-react';

import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/shadcn/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import {
  SHIFT_VARIANTS,
  usePrototypeSettings,
  useUpdatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { toggleIn, type ShiftDraft } from './model';
import { useShiftToast } from './toast-store';

/** Prototype chrome: flip the window variant without closing it. */
export function VariantSwitch() {
  const { shift } = usePrototypeSettings();
  const update = useUpdatePrototypeSearch();

  return (
    <div
      className="flex w-fit items-center gap-0.5 rounded-full p-0.5 text-[11px] ring-1 ring-fuchsia-500/60"
      title="Прототип: вариант окна сдвига"
    >
      {SHIFT_VARIANTS.map((variant) => (
        <button
          key={variant.value}
          type="button"
          onClick={() => update({ shift: variant.value })}
          className={cn(
            'rounded-full px-2 py-0.5',
            variant.value === shift
              ? 'bg-fuchsia-600 text-white'
              : 'text-fuchsia-800 hover:bg-fuchsia-500/10 dark:text-fuchsia-300'
          )}
        >
          {variant.label}
        </button>
      ))}
    </div>
  );
}

export function TaskPicker({
  draft,
  trigger,
}: {
  draft: ShiftDraft;
  trigger: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandList className="max-h-80">
            {draft.groups.map(({ group, tasks }) => (
              <CommandGroup key={group.id} heading={group.title}>
                {tasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.title}
                    onSelect={() =>
                      draft.setTaskIds(toggleIn(draft.taskIds, task.id))
                    }
                  >
                    <Checkbox
                      checked={draft.taskIds.has(task.id)}
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <span className="truncate">{task.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function DaysStepper({
  days,
  onChange,
}: {
  days: number;
  onChange: (days: number) => void;
}) {
  return (
    <span className="inline-flex items-center rounded-md border bg-background align-middle">
      <button
        type="button"
        aria-label="На день раньше"
        onClick={() => onChange(days - 1)}
        className="grid size-7 place-items-center hover:bg-muted"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        value={days}
        aria-label="Дней"
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-7 w-10 border-x bg-transparent text-center text-sm tabular-nums outline-none"
      />
      <button
        type="button"
        aria-label="На день позже"
        onClick={() => onChange(days + 1)}
        className="grid size-7 place-items-center hover:bg-muted"
      >
        <Plus className="size-3.5" />
      </button>
    </span>
  );
}

/** «Сразу»: the toast with «Отменить», above the bottom bars. */
export function ShiftToastView() {
  const toast = useShiftToast((state) => state.toast);
  const dismiss = useShiftToast((state) => state.dismiss);
  const edit = useScheduleEdit();

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(dismiss, 10000);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) {
    return null;
  }

  return (
    <div
      role="status"
      className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-lg bg-foreground py-2 pr-2 pl-4 text-sm text-background shadow-lg"
    >
      <span className="min-w-0 flex-1">
        <span className="font-medium">{toast.title}</span>
        {toast.detail ? (
          <span className="block text-xs text-background/70">
            {toast.detail}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={() => {
          edit(toast.undo, toast.undoLabel);
          dismiss();
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-medium hover:bg-background/15"
      >
        <Undo2 className="size-4" /> Отменить
      </button>
      <button
        type="button"
        aria-label="Закрыть"
        onClick={dismiss}
        className="grid size-8 place-items-center rounded-md hover:bg-background/15"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Clockwise-like row: a one-line summary that unfolds into details. */
export function Unfold({
  open,
  onToggle,
  tone = 'muted',
  summary,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  tone?: 'muted' | 'warn';
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border',
        tone === 'warn' && 'border-amber-500/40 bg-amber-500/5'
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
      >
        <span>{summary}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? <div className="border-t px-3 py-2">{children}</div> : null}
    </div>
  );
}
