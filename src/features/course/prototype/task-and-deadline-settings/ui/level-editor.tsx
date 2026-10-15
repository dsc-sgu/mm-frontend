// PROTOTYPE (#181): editor of one level — Task Deadline, a Student Group's
// or a Student's Deadline Override: date and time, quick moves, then the two
// non-date values and the reason, as in Todoist / Stripe date popovers.
import { useState } from 'react';
import { Ban, CornerDownRight } from 'lucide-react';

import { Input } from '@/shadcn/components/ui/input';
import type {
  DeadlineCommand,
  DeadlineValue,
  LevelValue,
  OverrideTarget,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  formatCompactMoment,
  NOW,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import {
  MomentPicker,
  OptionRow,
} from '@/features/course/prototype/task-and-deadline-settings/ui/moment-picker';

function endOfToday() {
  const date = new Date(NOW);
  date.setHours(23, 59, 0, 0);
  return date.getTime();
}

const STEPS = [
  { label: '−1 день', days: -1 },
  { label: '+1 день', days: 1 },
  { label: '+2 дня', days: 2 },
  { label: '+1 неделя', days: 7 },
] as const;

export function LevelEditor({
  taskId,
  target,
  value,
  inherited,
  reason,
  onCommands,
  inheritLabel = 'Как общий дедлайн',
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
    <MomentPicker
      defaultTime="23:59"
      value={value.kind === 'at' ? value.at : null}
      inherited={
        value.kind === 'inherit' && inherited?.kind === 'at'
          ? inherited.at
          : undefined
      }
      onCommit={(at) => setValue({ kind: 'at', at })}
      base={base}
      steps={STEPS}
      options={
        <>
          {target ? (
            <OptionRow
              selected={value.kind === 'inherit'}
              icon={<CornerDownRight />}
              label={inheritLabel}
              detail={
                inherited?.kind === 'at'
                  ? formatCompactMoment(inherited.at)
                  : inherited
                    ? 'без дедлайна'
                    : undefined
              }
              onSelect={() =>
                onCommands([{ type: 'reset-override', taskId, target }])
              }
            />
          ) : null}
          <OptionRow
            selected={value.kind === 'none'}
            icon={<Ban />}
            label="Без дедлайна"
            onSelect={() => setValue({ kind: 'none' })}
          />
        </>
      }
      extra={
        target && value.kind !== 'inherit' ? (
          <ReasonInput
            key={reason}
            reason={reason ?? ''}
            onCommit={(next) =>
              onCommands([{ type: 'set-reason', taskId, target, reason: next }])
            }
          />
        ) : null
      }
    />
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
    <label className="grid gap-1.5">
      <span className="text-xs font-medium">Причина</span>
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
      <span className="text-xs text-muted-foreground">
        Её видят преподаватели и те, к кому она относится
      </span>
    </label>
  );
}
