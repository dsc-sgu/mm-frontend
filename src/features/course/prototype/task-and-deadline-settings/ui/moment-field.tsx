// PROTOTYPE (#181): one keyboard control for date and time. «22.09» means
// 22.09 23:59 for a deadline and 00:00 for an opening time; ↑/↓ move a day,
// Shift+↑/↓ a week. The host labels the time zone once.
import { useState, type KeyboardEvent } from 'react';
import { CalendarClock } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import {
  formatInputValue,
  formatMomentLong,
  parseMomentInput,
  shiftDays,
} from '@/features/course/prototype/task-and-deadline-settings/time';

export function MomentField({
  value,
  onCommit,
  defaultTime,
  placeholder = 'Например, 22.09 или 22.09 18:00',
  allowEmpty = false,
  disabled = false,
  autoFocus = false,
  id,
}: {
  value: number | null;
  onCommit: (at: number | null) => void;
  defaultTime: '23:59' | '00:00';
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}) {
  const formatted = value === null ? '' : formatInputValue(value);
  const [text, setText] = useState(formatted);
  const [seen, setSeen] = useState(formatted);

  // Follow outside changes (shortcuts, applied batch) while not typing.
  if (seen !== formatted) {
    setSeen(formatted);
    setText(formatted);
  }

  const parsed = parseMomentInput(text, defaultTime);
  const dirty = text.trim() !== formatted;
  const invalid = dirty && parsed.status === 'invalid';

  function commit() {
    if (!dirty) {
      return;
    }

    if (parsed.status === 'valid') {
      setText(formatInputValue(parsed.at));
      onCommit(parsed.at);
    }

    if (parsed.status === 'empty' && allowEmpty) {
      onCommit(null);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }

    if (event.key === 'Escape' && dirty) {
      event.preventDefault();
      event.stopPropagation();
      setText(formatted);
    }

    if (
      (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
      parsed.status === 'valid'
    ) {
      event.preventDefault();
      const step =
        (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 7 : 1);
      setText(formatInputValue(shiftDays(parsed.at, step)));
    }
  }

  return (
    <div className="grid gap-1">
      <div
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border bg-background px-2.5',
          'focus-within:ring-[3px] focus-within:ring-ring/40',
          invalid
            ? 'border-destructive focus-within:ring-destructive/20'
            : 'border-input',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <CalendarClock
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id={id}
          value={text}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-invalid={invalid}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none placeholder:text-muted-foreground"
        />
      </div>
      {dirty ? (
        <p
          className={cn(
            'text-xs',
            invalid ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {parsed.status === 'valid'
            ? `${formatMomentLong(parsed.at)}${
                parsed.usedDefaultTime ? ` (время по умолчанию)` : ''
              }. Enter — применить`
            : parsed.status === 'invalid'
              ? parsed.message
              : allowEmpty
                ? 'Enter — убрать время'
                : 'Введите дату'}
        </p>
      ) : null}
    </div>
  );
}
