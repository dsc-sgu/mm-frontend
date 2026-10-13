// PROTOTYPE (#181): editor of one level — Task Deadline, a Student Group's
// or a Student's Deadline Override: inherit / date / «без срока» + reason.
import { useState } from 'react';

import { Input } from '@/shadcn/components/ui/input';
import type {
  DeadlineCommand,
  DeadlineValue,
  LevelValue,
  OverrideTarget,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { MomentField } from '@/features/course/prototype/task-and-deadline-settings/ui/moment-field';
import { Segmented } from '@/features/course/prototype/task-and-deadline-settings/ui/segmented';
import { DeadlineText } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';

type Mode = 'inherit' | 'at' | 'none';

export function LevelEditor({
  taskId,
  target,
  value,
  inherited,
  reason,
  onCommands,
  autoFocus = false,
  compact = false,
  inheritLabel = 'Наследует',
}: {
  taskId: string;
  /** Undefined edits the Task Deadline itself. */
  target?: OverrideTarget;
  value: LevelValue;
  inherited?: DeadlineValue;
  reason?: string;
  onCommands: (commands: DeadlineCommand[]) => void;
  autoFocus?: boolean;
  compact?: boolean;
  inheritLabel?: string;
}) {
  const [pickingDate, setPickingDate] = useState(false);
  const mode: Mode = pickingDate ? 'at' : value.kind;

  function setValue(next: DeadlineValue) {
    onCommands([
      target
        ? { type: 'set-override', taskId, target, value: next }
        : { type: 'set-task-deadline', taskId, value: next },
    ]);
  }

  function changeMode(next: Mode) {
    setPickingDate(false);

    if (next === mode) {
      return;
    }

    if (next === 'inherit') {
      if (target) {
        onCommands([{ type: 'reset-override', taskId, target }]);
      }
      return;
    }

    if (next === 'none') {
      setValue({ kind: 'none' });
      return;
    }

    // An explicit date starts from the inherited one: it is pinned even when
    // equal, so later changes of the Task Deadline do not move it.
    if (inherited?.kind === 'at' && target) {
      setValue(inherited);
      return;
    }

    setPickingDate(true);
  }

  const options = target
    ? ([
        { value: 'inherit', label: inheritLabel },
        { value: 'at', label: 'Дата' },
        { value: 'none', label: 'Без срока' },
      ] as const)
    : ([
        { value: 'at', label: 'Дата' },
        { value: 'none', label: 'Без срока' },
      ] as const);

  return (
    <div className="grid gap-2">
      <Segmented
        size="xs"
        value={mode}
        options={options}
        onChange={changeMode}
        label="Значение срока"
      />
      {mode === 'inherit' && inherited ? (
        <p className="text-xs text-muted-foreground">
          Сейчас:{' '}
          <DeadlineText value={{ kind: 'inherit' }} inherited={inherited} />.
          Изменится вместе с вышестоящим сроком.
        </p>
      ) : null}
      {mode === 'at' ? (
        <MomentField
          compact={compact}
          autoFocus={autoFocus || pickingDate}
          defaultTime="23:59"
          value={value.kind === 'at' ? value.at : null}
          onCommit={(at) => {
            setPickingDate(false);
            if (at !== null) {
              setValue({ kind: 'at', at });
            }
          }}
        />
      ) : null}
      {target && value.kind !== 'inherit' ? (
        <ReasonInput
          key={reason}
          reason={reason ?? ''}
          onCommit={(next) =>
            onCommands([{ type: 'set-reason', taskId, target, reason: next }])
          }
        />
      ) : null}
    </div>
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
    <label className="grid gap-1 text-xs text-muted-foreground">
      Причина — видят Teachers и те, к кому относится
      <Input
        value={text}
        placeholder="Необязательно"
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
