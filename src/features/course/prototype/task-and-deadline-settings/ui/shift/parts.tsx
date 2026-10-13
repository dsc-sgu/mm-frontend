// PROTOTYPE (#181): small pieces shared by the mass-shift windows.
import { useEffect, useState, type ReactNode } from 'react';
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
import { plural, toggleIn, type ShiftDraft } from './model';
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
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span className="inline-flex items-center rounded-md border bg-background">
        <button
          type="button"
          aria-label="На день раньше"
          onClick={() => onChange(days - 1)}
          className="grid size-7 place-items-center hover:bg-muted"
        >
          <Minus className="size-3.5" />
        </button>
        <DaysInput days={days} onChange={onChange} className="w-10 border-x" />
        <button
          type="button"
          aria-label="На день позже"
          onClick={() => onChange(days + 1)}
          className="grid size-7 place-items-center hover:bg-muted"
        >
          <Plus className="size-3.5" />
        </button>
      </span>
      <span className="text-sm text-muted-foreground">
        {plural(days, 'день', 'дня', 'дней')}
      </span>
    </span>
  );
}

/** A signed number of days as plain text: no browser spin arrows. */
function DaysInput({
  days,
  onChange,
  className,
}: {
  days: number;
  onChange: (days: number) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={days === 0 ? '' : String(days)}
      placeholder="0"
      aria-label="Сколько дней"
      onChange={(event) => {
        const parsed = Number.parseInt(
          event.target.value.replace('−', '-'),
          10
        );
        onChange(Number.isNaN(parsed) ? 0 : parsed);
      }}
      className={cn(
        'h-7 bg-transparent text-center text-sm tabular-nums outline-none',
        className
      )}
    />
  );
}

const DAY_STEPS = [-7, -1, 1, 2, 7, 14];

/** Shift buttons from «Сразу» plus a labelled field for any other value. */
export function DaysPicker({
  days,
  onChange,
}: {
  days: number;
  onChange: (days: number) => void;
}) {
  const custom = !DAY_STEPS.includes(days);

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {DAY_STEPS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === days}
            onClick={() => onChange(value)}
            className={cn(
              'h-9 rounded-md border px-2 text-sm whitespace-nowrap tabular-nums transition-colors',
              value === days
                ? 'border-foreground bg-foreground text-background'
                : 'hover:bg-muted',
              value < 0 && value !== days && 'text-muted-foreground'
            )}
          >
            {value > 0 ? `+${value}` : `−${-value}`}{' '}
            {plural(value, 'день', 'дня', 'дней')}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Или своё:
        <span
          className={cn(
            'inline-flex items-center rounded-md border bg-background px-1',
            custom && days !== 0 && 'border-foreground'
          )}
        >
          <DaysInput days={days} onChange={onChange} className="w-12" />
        </span>
        <span>
          {plural(days, 'день', 'дня', 'дней')} {days < 0 ? 'раньше' : 'позже'}
        </span>
        <span className="text-xs">(минус — раньше)</span>
      </label>
    </div>
  );
}

/** Tasks picked right in the window, no popover. */
export function TaskChooser({
  groups,
  taskIds,
  onChange,
}: {
  groups: ReadonlyArray<{
    group: { id: string; title: string };
    tasks: ReadonlyArray<{ id: string; title: string }>;
  }>;
  taskIds: ReadonlySet<string>;
  onChange: (taskIds: ReadonlySet<string>) => void;
}) {
  const [open, setOpen] = useState(taskIds.size === 0);
  const titles = new Map(
    groups.flatMap(({ tasks }) => tasks.map((task) => [task.id, task.title]))
  );

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {[...taskIds].map((taskId) => (
          <span
            key={taskId}
            className="inline-flex h-7 items-center gap-1 rounded-md border bg-muted/40 pr-1 pl-2 text-sm"
          >
            <span className="max-w-56 truncate">{titles.get(taskId)}</span>
            <button
              type="button"
              aria-label={`Убрать ${titles.get(taskId)}`}
              onClick={() => onChange(toggleIn(taskIds, taskId))}
              className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {taskIds.size === 0 ? 'Выбрать Task' : 'Другие Task'}
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </div>
      {open ? (
        <div className="grid max-h-56 gap-3 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
          {groups.map(({ group, tasks }) => {
            const all = tasks.every((task) => taskIds.has(task.id));
            return (
              <div key={group.id} className="grid content-start gap-1">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Checkbox
                    checked={all}
                    onCheckedChange={() => {
                      const next = new Set(taskIds);
                      for (const task of tasks) {
                        if (all) {
                          next.delete(task.id);
                        } else {
                          next.add(task.id);
                        }
                      }
                      onChange(next);
                    }}
                  />
                  {group.title}
                </label>
                {tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex min-w-0 items-center gap-2 pl-6 text-sm"
                  >
                    <Checkbox
                      checked={taskIds.has(task.id)}
                      onCheckedChange={() =>
                        onChange(toggleIn(taskIds, task.id))
                      }
                    />
                    <span className="truncate">{task.title}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
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
