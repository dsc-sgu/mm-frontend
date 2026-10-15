// PROTOTYPE (#181): date and time of a deadline or an opening time. One
// calendar, one time field, quick moves and the non-date options, laid out
// in a column or in two columns (`?picker=`), as in Todoist / Superlist
// (column) and Stripe / ClickUp / Evernote (two columns). A picked day
// applies at once; the time applies on Enter or when the field loses focus,
// so typing «18:30» is one change.
import { useState, type ComponentProps, type ReactNode } from 'react';
import { CalendarMinus, CalendarPlus, Check, Clock } from 'lucide-react';
import { ru } from 'react-day-picker/locale';

import { buttonVariants } from '@/shadcn/components/ui/button';
import { Calendar, CalendarDayButton } from '@/shadcn/components/ui/calendar';
import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  formatDay,
  NOW,
  shiftDays,
  timeZoneLabel,
} from '@/features/course/prototype/task-and-deadline-settings/time';

export type Step = { label: string; days: number };

const pad = (value: number) => String(value).padStart(2, '0');

function clock(at: number) {
  const date = new Date(at);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** «18:30», «1830», «9.05» → «18:30» / «18:30» / «09:05»; null if not a time. */
function parseTime(text: string) {
  const match = /^(\d{1,2})[:.\s]?(\d{2})$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? `${pad(hours)}:${pad(minutes)}` : null;
}

function atClock(day: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes
  ).getTime();
}

const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long' });
const weekdayDay = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function formatCaption(month: Date) {
  const name = monthName.format(month);
  return `${name[0].toUpperCase()}${name.slice(1)} ${month.getFullYear()}`;
}

/** Today gets a dot under the number instead of a filled cell. */
function DayButton(props: ComponentProps<typeof CalendarDayButton>) {
  return (
    <CalendarDayButton {...props}>
      {props.children}
      {props.modifiers.today ? (
        <span
          aria-hidden="true"
          className="absolute bottom-1 size-1 rounded-full bg-current"
        />
      ) : null}
    </CalendarDayButton>
  );
}

const NAV_BUTTON = cn(
  buttonVariants({ variant: 'ghost' }),
  'size-7 p-0 text-muted-foreground select-none hover:text-foreground',
  'aria-disabled:opacity-50'
);

function DayCalendar({
  selected,
  inherited,
  onSelect,
}: {
  selected: number | null;
  inherited?: number;
  onSelect: (day: Date) => void;
}) {
  const day = selected === null ? undefined : new Date(selected);
  const hint = inherited === undefined ? undefined : new Date(inherited);
  const [month, setMonth] = useState(day ?? hint ?? new Date(NOW));
  const [seen, setSeen] = useState(selected);

  // A quick move into another month shows that month.
  if (seen !== selected) {
    setSeen(selected);
    if (day) {
      setMonth(day);
    }
  }

  return (
    <Calendar
      mode="single"
      required
      locale={ru}
      today={new Date(NOW)}
      // Every month takes six rows, so the popover keeps its height.
      fixedWeeks
      selected={day}
      month={month}
      onMonthChange={setMonth}
      onSelect={onSelect}
      formatters={{ formatCaption }}
      components={{ DayButton }}
      modifiers={hint ? { inherited: hint } : undefined}
      modifiersClassNames={{
        inherited:
          '[&>button]:border [&>button]:border-dashed [&>button]:border-muted-foreground/60',
      }}
      className="w-full p-0"
      classNames={{
        root: 'w-full',
        months: 'relative flex flex-col',
        month: 'flex w-full flex-col gap-1',
        nav: 'absolute top-0 right-0 flex items-center gap-0.5',
        button_previous: NAV_BUTTON,
        button_next: NAV_BUTTON,
        month_caption: 'flex h-7 items-center px-1',
        caption_label: 'text-sm font-medium select-none',
        weekdays: 'flex',
        weekday:
          'flex-1 pb-1 text-xs font-normal text-muted-foreground select-none',
        week: 'mt-0.5 flex w-full',
        day: 'relative h-8 flex-1 p-0 text-center select-none',
        day_button: cn(
          'relative aspect-auto h-8 w-full min-w-0 rounded-md',
          'text-sm tabular-nums'
        ),
        today: '',
        outside: 'text-muted-foreground/50',
      }}
    />
  );
}

function TimeField({
  value,
  time,
  onChange,
  onCommit,
}: {
  value: string;
  time: string;
  onChange: (time: string) => void;
  onCommit: () => void;
}) {
  return (
    <div className="flex h-8 items-center gap-2 text-sm">
      <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
      <span>Время</span>
      <span
        className="ml-auto truncate text-xs text-muted-foreground"
        title="Часовой пояс браузера"
      >
        {timeZoneLabel()}
      </span>
      <Input
        value={time}
        inputMode="numeric"
        aria-label="Время"
        placeholder={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onCommit();
          }
        }}
        className="h-8 w-16 shrink-0 text-center tabular-nums"
      />
    </div>
  );
}

/** Column layout: equal buttons in one row, each with the day it lands on. */
function StepBar({
  base,
  steps,
  onPick,
}: {
  base: number;
  steps: ReadonlyArray<Step>;
  onPick: (at: number) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col divide-x overflow-hidden rounded-md border">
      {steps.map((step) => {
        const at = shiftDays(base, step.days);
        return (
          <button
            key={step.label}
            type="button"
            onClick={() => onPick(at)}
            className={cn(
              'grid h-11 content-center gap-0.5 text-center transition-colors',
              'outline-none hover:bg-accent focus-visible:bg-accent'
            )}
          >
            <span className="text-xs font-medium">{step.label}</span>
            <span className="text-[0.6875rem] text-muted-foreground tabular-nums">
              {formatDay(at)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const ROW = cn(
  'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm',
  'transition-colors outline-none hover:bg-accent focus-visible:bg-accent'
);

/** Two-column layout: moves as menu rows with the day they land on. */
function StepList({
  base,
  steps,
  onPick,
}: {
  base: number;
  steps: ReadonlyArray<Step>;
  onPick: (at: number) => void;
}) {
  return (
    <div className="grid p-1">
      {steps.map((step) => {
        const at = shiftDays(base, step.days);
        const Icon = step.days < 0 ? CalendarMinus : CalendarPlus;
        return (
          <button
            key={step.label}
            type="button"
            onClick={() => onPick(at)}
            className={ROW}
          >
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">{step.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {weekdayDay.format(at).replace(/\.(?=,|\s|$)/g, '')}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function OptionRow({
  selected,
  icon,
  label,
  detail,
  onSelect,
}: {
  selected: boolean;
  icon: ReactNode;
  label: string;
  detail?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(ROW, selected && 'font-medium')}
    >
      <span className="text-muted-foreground [&>svg]:size-4">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {detail ? (
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {detail}
        </span>
      ) : null}
      <Check className={cn('size-4 shrink-0', !selected && 'invisible')} />
    </button>
  );
}

export function MomentPicker({
  value,
  onCommit,
  defaultTime,
  inherited,
  base,
  steps,
  options,
  extra,
}: {
  value: number | null;
  onCommit: (at: number) => void;
  /** Time of a newly picked day: 23:59 for deadlines, 00:00 for opening. */
  defaultTime: '23:59' | '00:00';
  /** The value in effect while there is no own one, marked on the calendar. */
  inherited?: number;
  /** What the quick moves count from. */
  base: number;
  steps: ReadonlyArray<Step>;
  /** Non-date values as `OptionRow`s. */
  options: ReactNode;
  /** Reason, warnings: full width under everything else. */
  extra?: ReactNode;
}) {
  const { picker } = usePrototypeSettings();
  const shownTime = value === null ? defaultTime : clock(value);
  const [time, setTime] = useState(shownTime);
  const [seen, setSeen] = useState(shownTime);

  // Follow outside changes (quick moves, an applied batch).
  if (seen !== shownTime) {
    setSeen(shownTime);
    setTime(shownTime);
  }

  function commitTime() {
    const parsed = parseTime(time);
    if (parsed === null) {
      setTime(shownTime);
      return;
    }
    setTime(parsed);
    if (value !== null && parsed !== shownTime) {
      onCommit(atClock(new Date(value), parsed));
    }
  }

  const calendar = (
    <DayCalendar
      selected={value}
      inherited={inherited}
      onSelect={(day) => onCommit(atClock(day, parseTime(time) ?? shownTime))}
    />
  );
  const timeField = (
    <TimeField
      value={shownTime}
      time={time}
      onChange={setTime}
      onCommit={commitTime}
    />
  );

  if (picker === 'split') {
    return (
      <div data-picker="split" className="divide-y">
        <div className="flex divide-x">
          <div className="w-68 shrink-0 p-3">{calendar}</div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="px-3 py-2">{timeField}</div>
            <div className="border-t">
              <StepList base={base} steps={steps} onPick={onCommit} />
            </div>
            <div className="mt-auto grid border-t p-1">{options}</div>
          </div>
        </div>
        {extra ? <div className="grid gap-3 p-3">{extra}</div> : null}
      </div>
    );
  }

  return (
    <div data-picker="stack" className="divide-y">
      <div className="p-3">{calendar}</div>
      <div className="grid gap-2.5 p-3">
        {timeField}
        <StepBar base={base} steps={steps} onPick={onCommit} />
      </div>
      <div className="grid p-1">{options}</div>
      {extra ? <div className="grid gap-3 p-3">{extra}</div> : null}
    </div>
  );
}
