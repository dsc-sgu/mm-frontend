// PROTOTYPE (#181): Task Opening Time with the #180 warnings — later than a
// deadline, and «уже открыта N Students» when moved later.
import { TriangleAlert } from 'lucide-react';

import {
  isTaskOpen,
  openingAfterDeadline,
  type DeadlineCommand,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  STUDENTS,
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { formatMoment } from '@/features/course/prototype/task-and-deadline-settings/time';
import { MomentField } from '@/features/course/prototype/task-and-deadline-settings/ui/moment-field';

export function OpeningTimeField({
  taskId,
  value,
  onCommands,
  onValueChange,
  disabled,
}: {
  taskId: string;
  /** Local value of a form; defaults to the view schedule. */
  value?: number | null;
  onCommands?: (commands: DeadlineCommand[]) => void;
  onValueChange?: (at: number | null) => void;
  disabled?: boolean;
}) {
  const schedule = useViewSchedule();
  const appliedOpening = useSandbox(
    (state) => state.schedule.tasks[taskId]?.openingTime ?? null
  );
  const opening =
    value === undefined ? (schedule.tasks[taskId]?.openingTime ?? null) : value;
  const alreadyOpen = isTaskOpen(appliedOpening);
  const conflicts = openingAfterDeadline(schedule, taskId, opening, STUDENTS);
  const movedLater =
    alreadyOpen && opening !== null && opening > (appliedOpening ?? 0);

  return (
    <div className="grid gap-1.5">
      <MomentField
        defaultTime="00:00"
        allowEmpty
        disabled={disabled}
        placeholder="Пусто — Task не сдерживается временем"
        value={opening}
        onCommit={(at) => {
          onValueChange?.(at);
          onCommands?.([{ type: 'set-opening-time', taskId, at }]);
        }}
      />
      <p className="text-xs text-muted-foreground">
        {alreadyOpen
          ? `Уже открыта всем ${STUDENTS.length} Students${appliedOpening ? ` с ${formatMoment(appliedOpening)}` : ''}.`
          : `Откроется ${formatMoment(appliedOpening!)}; пока закрыта всем.`}
      </p>
      {movedLater ? (
        <Warning>
          Уже открыта {STUDENTS.length} Students: перенос на более позднее время
          у них доступ не заберёт.
        </Warning>
      ) : null}
      {conflicts.task || conflicts.students > 0 ? (
        <Warning>
          Открытие позже{' '}
          {conflicts.task ? 'общего срока' : 'Effective Deadline'}
          {conflicts.students > 0
            ? ` у ${conflicts.students} из ${STUDENTS.length} Students`
            : ''}
          . Сохранить можно, но они увидят Task уже просроченной.
        </Warning>
      ) : null}
    </div>
  );
}

export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-900 dark:text-amber-200">
      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
