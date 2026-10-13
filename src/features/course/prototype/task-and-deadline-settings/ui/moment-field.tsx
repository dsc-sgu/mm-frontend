// PROTOTYPE (#181): one keyboard control for date and time. «22.09» means
// 22.09 23:59 for a deadline and 00:00 for an opening time; ↑/↓ move a day,
// Shift+↑/↓ a week. The time zone is always labelled.
import { useState, type KeyboardEvent } from 'react';
import { CalendarClock } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import {
  formatInputValue,
  formatMomentLong,
  parseMomentInput,
  shiftDays,
  timeZoneLabel,
} from '@/features/course/prototype/task-and-deadline-settings/time';

export function MomentField({
  value,
  onCommit,
  defaultTime,
  placeholder = '22.09 или 22.09.2026 18:00',
  allowEmpty = false,
  disabled = false,
  autoFocus = false,
  id,
  compact = false,
}: {
  value: number | null;
  onCommit: (at: number | null) => void;
  defaultTime: '23:59' | '00:00';
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  compact?: boolean;
}) {
  const formatted = value === null ? '' : formatInputValue(value);
  const [text, setText] = useState(formatted);
  const [seen, setSeen] = useState(formatted);

  // Follow outside changes (applied batch, other variant) while not typing.
  if (seen !== formatted) {
    setSeen(formatted);
    setText(formatted);
  }

  const parsed = parseMomentInput(text, defaultTime);
  const dirty = text.trim() !== formatted;

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

  const invalid =
    parsed.status === 'invalid' || (parsed.status === 'empty' && !allowEmpty);

  return (
    <div className="grid gap-1">
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background px-2.5',
          'focus-within:ring-[3px] focus-within:ring-ring/50',
          compact ? 'h-8' : 'h-9',
          invalid && dirty
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
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={cn(
            'min-w-0 flex-1 bg-transparent font-mono text-sm tabular-nums',
            'outline-none placeholder:font-sans placeholder:text-muted-foreground'
          )}
        />
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {timeZoneLabel()}
        </span>
      </div>
      {dirty || !compact ? (
        <p
          className={cn(
            'min-h-4 text-xs',
            invalid && dirty ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {parsed.status === 'valid'
            ? `${formatMomentLong(parsed.at)}${
                parsed.usedDefaultTime
                  ? ` · время по умолчанию ${defaultTime}`
                  : ''
              }${dirty ? ' · Enter — применить, Esc — отменить' : ''}`
            : parsed.status === 'invalid'
              ? parsed.message
              : allowEmpty
                ? 'Пусто — время не задано'
                : 'Введите дату'}
        </p>
      ) : null}
    </div>
  );
}
