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
  usePrototypeSettings,
  useUpdatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import { SHIFT_VARIANTS } from '@/features/course/prototype/task-and-deadline-settings/settings';
import {
  formatMoment,
  parseMomentInput,
} from '@/features/course/prototype/task-and-deadline-settings/time';
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

/** A titled block of a shift or extension window. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

export function TaskPicker({
  draft,
  trigger,
}: {
  draft: {
    groups: ShiftDraft['groups'];
    taskIds: ReadonlySet<string>;
    setTaskIds: (next: ReadonlySet<string>) => void;
  };
  trigger: ReactNode;
}) {
  return (
    // Modal: the Dialog blocks wheel scroll outside itself, and this list is
    // portaled out of it. A modal Popover lets its own content scroll.
    <Popover modal>
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

/** Positive numbers always carry «+», so «+3» and «−3» read alike. */
function signed(days: number) {
  if (days === 0) {
    return '0';
  }

  return days > 0 ? `+${days}` : `−${-days}`;
}

/**
 * As typed, but signed like the buttons: «3» becomes «+3», «-» becomes «−».
 * A lone sign stays while the Teacher is still typing.
 */
function withSign(text: string) {
  const minus = text.replace('-', '−');
  return /^\s*\d+\s*$/.test(minus) && Number(minus) > 0
    ? `+${minus.trim()}`
    : minus;
}

/** «−3», «-3», «+3», «3» → a signed number of days; anything else → null. */
function parseDays(text: string) {
  const clean = text.trim().replace('−', '-').replace('+', '');
  return /^-?\d+$/.test(clean) ? Number(clean) : null;
}

/**
 * A signed number of days as plain text: no browser spin arrows, and a lone
 * «-» stays while the Teacher is typing a negative number.
 */
function DaysInput({
  days,
  onChange,
  className,
}: {
  days: number;
  onChange: (days: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(signed(days));
  const [seen, setSeen] = useState(days);

  if (seen !== days) {
    setSeen(days);
    if (parseDays(text) !== days) {
      setText(signed(days));
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      aria-label="Сколько дней"
      onChange={(event) => {
        setText(withSign(event.target.value));
        const parsed = parseDays(event.target.value);
        if (parsed !== null) {
          setSeen(parsed);
          onChange(parsed);
        }
      }}
      className={cn(
        'h-7 bg-transparent text-center text-sm tabular-nums outline-none',
        className
      )}
    />
  );
}

const DAY_STEPS = [-7, -1, 1, 2, 7, 14];

const DAY_CELL = cn(
  'h-9 cursor-pointer rounded-md border px-1 text-sm whitespace-nowrap tabular-nums transition-colors sm:px-2'
);

const CUSTOM_SPAN = { 1: '', 2: 'col-span-2' } as const;

/**
 * Shift buttons from «Сразу»; the last cell looks like them and takes any
 * other number, negative for earlier. `days` is null while another way of
 * choosing (a cell passed as children) is active.
 */
export function DaysPicker({
  days,
  onChange,
  steps = DAY_STEPS,
  customSpan = 2,
  children,
}: {
  days: number | null;
  onChange: (days: number) => void;
  steps?: readonly number[];
  customSpan?: keyof typeof CUSTOM_SPAN;
  children?: ReactNode;
}) {
  const [text, setText] = useState(
    days === null || steps.includes(days) ? '' : signed(days)
  );
  const [seen, setSeen] = useState(days);
  const typed = parseDays(text);
  const customActive = text !== '' && typed !== null && typed === days;

  // Another cell took over: the typed number no longer applies.
  if (seen !== days) {
    setSeen(days);
    if (days === null) {
      setText('');
    }
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {steps.map((value) => {
        const selected = value === days && !customActive;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              setText('');
              onChange(value);
            }}
            className={cn(
              DAY_CELL,
              selected
                ? 'border-foreground bg-foreground text-background'
                : 'hover:bg-muted',
              value < 0 && !selected && 'text-muted-foreground'
            )}
          >
            {value > 0 ? `+${value}` : `−${-value}`}{' '}
            {plural(value, 'день', 'дня', 'дней')}
          </button>
        );
      })}
      <label
        className={cn(
          DAY_CELL,
          CUSTOM_SPAN[customSpan],
          'flex items-center justify-center gap-1',
          'focus-within:ring-2 focus-within:ring-ring',
          customActive
            ? 'border-foreground bg-foreground text-background'
            : 'hover:bg-muted'
        )}
      >
        <input
          type="text"
          inputMode="numeric"
          value={text}
          placeholder="или своё"
          aria-label="Своё число дней, минус — раньше"
          onChange={(event) => {
            setText(withSign(event.target.value));
            const parsed = parseDays(event.target.value);
            if (parsed !== null && parsed !== 0) {
              onChange(parsed);
            }
          }}
          className={cn(
            'w-full min-w-0 bg-transparent text-center tabular-nums outline-none',
            customActive
              ? 'placeholder:text-background/60'
              : 'placeholder:text-muted-foreground'
          )}
          style={{
            maxWidth: text ? `${text.length + 0.4}ch` : undefined,
          }}
        />
        {text !== '' && typed !== null ? (
          <span className="shrink-0">
            {plural(typed, 'день', 'дня', 'дней')}
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

/**
 * A DaysPicker cell for one date instead of a number of days: «до 3.11».
 * Shows the date it understood next to the typed text.
 */
export function UntilCell({
  at,
  onChange,
}: {
  at: number | null;
  onChange: (at: number) => void;
}) {
  const [text, setText] = useState('');
  const [seen, setSeen] = useState(at);
  const parsed = parseMomentInput(text, '23:59');
  const active = at !== null && parsed.status === 'valid' && parsed.at === at;

  // Days were chosen instead: the typed date no longer applies.
  if (seen !== at) {
    setSeen(at);
    if (at === null) {
      setText('');
    }
  }

  return (
    <label
      className={cn(
        DAY_CELL,
        'col-span-2 flex items-center justify-center gap-1.5',
        'focus-within:ring-2 focus-within:ring-ring',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'hover:bg-muted',
        parsed.status === 'invalid' && 'border-destructive/60'
      )}
    >
      {text ? <span className="shrink-0">до</span> : null}
      <input
        type="text"
        value={text}
        placeholder="или до даты"
        aria-label="Продлить до даты, например 3.11"
        onChange={(event) => {
          setText(event.target.value);
          const next = parseMomentInput(event.target.value, '23:59');
          if (next.status === 'valid') {
            onChange(next.at);
          }
        }}
        className={cn(
          'min-w-0 bg-transparent text-center tabular-nums outline-none',
          text ? 'w-[6ch]' : 'w-full',
          active
            ? 'placeholder:text-background/60'
            : 'placeholder:text-muted-foreground'
        )}
      />
      {parsed.status === 'valid' ? (
        <span
          className={cn(
            'shrink-0 text-xs',
            active ? 'text-background/70' : 'text-muted-foreground'
          )}
        >
          {formatMoment(parsed.at)}
        </span>
      ) : null}
    </label>
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
