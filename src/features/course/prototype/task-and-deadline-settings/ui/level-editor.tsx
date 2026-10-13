// PROTOTYPE (#181): editor of one level — Task Deadline, a Student Group's
// or a Student's Deadline Override. Typed date first, shortcuts, then the
// two non-date values, as in Todoist / Stripe date popovers.
import { useState, type ReactNode } from 'react';
import { Ban, Check, CornerDownRight } from 'lucide-react';

import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import type {
  DeadlineCommand,
  DeadlineValue,
  LevelValue,
  OverrideTarget,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  formatMoment,
  NOW,
  shiftDays,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { MomentField } from '@/features/course/prototype/task-and-deadline-settings/ui/moment-field';

function endOfToday() {
  const date = new Date(NOW);
  date.setHours(23, 59, 0, 0);
  return date.getTime();
}

export function Shortcuts({
  base,
  steps,
  onPick,
}: {
  base: number;
  steps: ReadonlyArray<{ label: string; days: number }>;
  onPick: (at: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {steps.map((step) => (
        <button
          key={step.label}
          type="button"
          onClick={() => onPick(shiftDays(base, step.days))}
          className="h-7 rounded-md border border-border px-2 text-xs hover:bg-muted"
        >
          {step.label}
        </button>
      ))}
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
      className={cn(
        'flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted',
        selected && 'font-medium'
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {detail ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {detail}
        </span>
      ) : null}
      <Check className={cn('size-4', !selected && 'invisible')} />
    </button>
  );
}

const STEPS = [
  { label: '+1 день', days: 1 },
  { label: '+2 дня', days: 2 },
  { label: '+1 неделя', days: 7 },
  { label: '−1 день', days: -1 },
] as const;

export function LevelEditor({
  taskId,
  target,
  value,
  inherited,
  reason,
  onCommands,
  inheritLabel = 'Как общий срок',
}: {
  taskId: string;
  /** Undefined edits the Task Deadline itself. */
  target?: OverrideTarget;
  value: LevelValue;
  inherited?: DeadlineValue;
  reason?: string;
  onCommands: (commands: DeadlineCommand[]) => void;
  inheritLabel?: string;
}) {
  function setValue(next: DeadlineValue) {
    onCommands([
      target
        ? { type: 'set-override', taskId, target, value: next }
        : { type: 'set-task-deadline', taskId, value: next },
    ]);
  }

  const base =
    value.kind === 'at'
      ? value.at
      : inherited?.kind === 'at'
        ? inherited.at
        : endOfToday();

  return (
    <>
      <MomentField
        autoFocus
        defaultTime="23:59"
        value={value.kind === 'at' ? value.at : null}
        placeholder={
          value.kind === 'inherit' && inherited?.kind === 'at'
            ? `Своя дата вместо ${formatMoment(inherited.at)}`
            : undefined
        }
        onCommit={(at) => {
          if (at !== null) {
            setValue({ kind: 'at', at });
          }
        }}
      />
      <Shortcuts
        base={base}
        steps={STEPS}
        onPick={(at) => setValue({ kind: 'at', at })}
      />
      <div className="-mx-1 grid border-t pt-2">
        {target ? (
          <OptionRow
            selected={value.kind === 'inherit'}
            icon={<CornerDownRight className="size-4" />}
            label={inheritLabel}
            detail={
              inherited?.kind === 'at'
                ? formatMoment(inherited.at)
                : inherited
                  ? 'без срока'
                  : undefined
            }
            onSelect={() =>
              onCommands([{ type: 'reset-override', taskId, target }])
            }
          />
        ) : null}
        <OptionRow
          selected={value.kind === 'none'}
          icon={<Ban className="size-4" />}
          label="Без срока"
          onSelect={() => setValue({ kind: 'none' })}
        />
      </div>
      {target && value.kind !== 'inherit' ? (
        <ReasonInput
          key={reason}
          reason={reason ?? ''}
          onCommit={(next) =>
            onCommands([{ type: 'set-reason', taskId, target, reason: next }])
          }
        />
      ) : null}
    </>
  );
}

function ReasonInput({
  reason,
  onCommit,
}: {
  reason: string;
  onCommit: (reason: string) => void;
}) {
  const [text, setText] = useState(reason);

  function commit() {
    if (text.trim() !== reason) {
      onCommit(text.trim());
    }
  }

  return (
    <label className="grid gap-1 border-t pt-3 text-xs text-muted-foreground">
      Причина. Её видят Teachers и те, к кому она относится
      <Input
        value={text}
        placeholder="Например, праздник в день занятия"
        className="h-8 text-sm"
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit();
          }
        }}
      />
    </label>
  );
}
