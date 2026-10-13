// PROTOTYPE (#181): Task Opening Time editor with the #180 warnings — later
// than a deadline, and «уже открыта N Students» when moved later.
import type { ReactNode } from 'react';
import { CircleSlash, TriangleAlert } from 'lucide-react';

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
import {
  formatMoment,
  NOW,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import {
  MomentPicker,
  OptionRow,
} from '@/features/course/prototype/task-and-deadline-settings/ui/moment-picker';

const STEPS = [
  { label: '−1 неделя', days: -7 },
  { label: '+1 день', days: 1 },
  { label: '+1 неделя', days: 7 },
] as const;

function startOfToday() {
  const date = new Date(NOW);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function OpeningEditor({
  taskId,
  onCommands,
}: {
  taskId: string;
  onCommands: (commands: DeadlineCommand[]) => void;
}) {
  const schedule = useViewSchedule();
  const opening = schedule.tasks[taskId]?.openingTime ?? null;
  const set = (at: number | null) =>
    onCommands([{ type: 'set-opening-time', taskId, at }]);

  return (
    <MomentPicker
      defaultTime="00:00"
      value={opening}
      onCommit={set}
      base={opening ?? startOfToday()}
      steps={STEPS}
      options={
        <OptionRow
          selected={opening === null}
          icon={<CircleSlash />}
          label="Открыто сразу"
          onSelect={() => set(null)}
        />
      }
      extra={<OpeningNotes taskId={taskId} />}
    />
  );
}

/** Warnings shown next to the opening time wherever it is edited. */
export function OpeningNotes({
  taskId,
  quietWhenFine = false,
}: {
  taskId: string;
  quietWhenFine?: boolean;
}) {
  const schedule = useViewSchedule();
  const appliedOpening = useSandbox(
    (state) => state.schedule.tasks[taskId]?.openingTime ?? null
  );
  const opening = schedule.tasks[taskId]?.openingTime ?? null;
  const alreadyOpen = isTaskOpen(appliedOpening);
  const conflicts = openingAfterDeadline(schedule, taskId, opening, STUDENTS);
  const movedLater =
    alreadyOpen && opening !== null && opening > (appliedOpening ?? 0);
  const late = conflicts.task || conflicts.students > 0;

  if (quietWhenFine && !movedLater && !late) {
    return null;
  }

  return (
    <div className="grid gap-1.5">
      {!quietWhenFine ? (
        <p className="text-xs text-muted-foreground">
          {alreadyOpen
            ? `Уже открыто всем ${STUDENTS.length} студентам`
            : `Пока закрыто, откроется ${formatMoment(appliedOpening!)}`}
        </p>
      ) : null}
      {movedLater ? (
        <Warning>
          Перенос на более позднее время не закроет задание для{' '}
          {STUDENTS.length} студентов, которым оно уже открыто.
        </Warning>
      ) : null}
      {late ? (
        <Warning>
          Откроется позже{' '}
          {conflicts.task
            ? 'общего дедлайна'
            : `дедлайна ${conflicts.students} из ${STUDENTS.length} студентов`}
          : они увидят его уже просроченным. Сохранить можно.
        </Warning>
      ) : null}
    </div>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-1.5 text-xs text-amber-800 dark:text-amber-300">
      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
