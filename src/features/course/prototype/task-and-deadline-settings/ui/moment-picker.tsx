// PROTOTYPE (#181): date and time of a deadline or an opening time — the
// shadcn Calendar for the day and a time field as in the shadcn «Date and
// Time Picker» example. A picked day applies at once; the time applies on
// Enter or when the field loses focus, so typing «18:30» is one change.
import { useState } from 'react';
import { ru } from 'react-day-picker/locale';

import { Calendar } from '@/shadcn/components/ui/calendar';
import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import { NOW } from '@/features/course/prototype/task-and-deadline-settings/time';

const TIME = /^\d{2}:\d{2}$/;

function clock(at: number) {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

export function MomentPicker({
  value,
  onCommit,
  defaultTime,
  inherited,
}: {
  value: number | null;
  onCommit: (at: number) => void;
  /** Time of a newly picked day: 23:59 for deadlines, 00:00 for opening. */
  defaultTime: '23:59' | '00:00';
  /** The value in effect while there is no own one, marked on the calendar. */
  inherited?: number;
}) {
  const shownTime = value === null ? defaultTime : clock(value);
  const [time, setTime] = useState(shownTime);
  const [seen, setSeen] = useState(shownTime);

  // Follow outside changes (shortcuts, an applied batch).
  if (seen !== shownTime) {
    setSeen(shownTime);
    setTime(shownTime);
  }

  const selected = value === null ? undefined : new Date(value);
  const hint = inherited === undefined ? undefined : new Date(inherited);

  function commitTime() {
    if (value !== null && TIME.test(time) && time !== shownTime) {
      onCommit(atClock(new Date(value), time));
    }
  }

  return (
    <div className="grid gap-2">
      <Calendar
        mode="single"
        required
        locale={ru}
        today={new Date(NOW)}
        selected={selected}
        defaultMonth={selected ?? hint ?? new Date(NOW)}
        onSelect={(day) =>
          onCommit(atClock(day, TIME.test(time) ? time : shownTime))
        }
        modifiers={hint ? { inherited: hint } : undefined}
        modifiersClassNames={{
          inherited:
            '[&_button]:border [&_button]:border-dashed [&_button]:border-foreground/40',
        }}
        className="mx-auto p-0 [--cell-size:--spacing(8)]"
      />
      <label className="flex items-center justify-between gap-3 border-t pt-2 text-sm">
        <span className="text-muted-foreground">Время</span>
        <Input
          type="time"
          step={60}
          value={time}
          aria-label="Время"
          onChange={(event) => setTime(event.target.value)}
          onBlur={commitTime}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitTime();
            }
          }}
          className={cn(
            'h-8 w-28 appearance-none bg-background',
            '[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
          )}
        />
      </label>
    </div>
  );
}
