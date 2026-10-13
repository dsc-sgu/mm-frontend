// PROTOTYPE (#181): «Продлить дедлайны» — an exception for chosen Students
// across several Tasks. Each Student gets a Deadline Override per Task,
// counted from their own Effective Deadline, with one reason for all.
// Tasks are picked in the list or found by a period of Effective Deadlines.
import { useMemo, useState } from 'react';

import { studentName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  applyCommands,
  effectiveDeadline,
  latenessChanges,
  type DeadlineCommand,
  type ResolvedDeadline,
  type Schedule,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  ATTEMPTS,
  STUDENTS,
  useOrderedTasks,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatDay,
  parseMomentInput,
  shiftDays,
  startOfDay,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import {
  daysLabel,
  flipsSentence,
  plural,
} from '@/features/course/prototype/task-and-deadline-settings/ui/shift/model';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));

export type ExtendPreset = { taskIds: string[]; studentIds: string[] };

/** How far: by a number of days, or up to one date for every Task. */
export type ExtendBy =
  | { kind: 'days'; days: number }
  | { kind: 'until'; at: number };

export type ExtendRow = {
  key: string;
  taskId: string;
  studentId: string;
  before: ResolvedDeadline;
  outcome:
    | { kind: 'extend'; after: number }
    | { kind: 'no-deadline' }
    | { kind: 'already-later' };
};

export function planExtension(
  schedule: Schedule,
  taskIds: readonly string[],
  studentIds: readonly string[],
  by: ExtendBy,
  reason: string
) {
  const rows: ExtendRow[] = [];
  const commands: DeadlineCommand[] = [];

  for (const taskId of taskIds) {
    for (const studentId of studentIds) {
      const student = studentsById.get(studentId);
      if (!student) {
        continue;
      }

      const before = effectiveDeadline(schedule, taskId, student);
      const key = `${taskId}|${studentId}`;

      if (before.value.kind !== 'at') {
        rows.push({
          key,
          taskId,
          studentId,
          before,
          outcome: { kind: 'no-deadline' },
        });
        continue;
      }

      const after =
        by.kind === 'days' ? shiftDays(before.value.at, by.days) : by.at;

      // An extension never moves a deadline earlier.
      if (after <= before.value.at) {
        rows.push({
          key,
          taskId,
          studentId,
          before,
          outcome: { kind: 'already-later' },
        });
        continue;
      }

      rows.push({
        key,
        taskId,
        studentId,
        before,
        outcome: { kind: 'extend', after },
      });
      commands.push({
        type: 'set-override',
        taskId,
        target: { kind: 'student', studentId },
        value: { kind: 'at', at: after },
        // Empty keeps the reason an existing personal deadline already has.
        reason: reason.trim() || undefined,
      });
    }
  }

  return { rows, commands };
}

/**
 * Tasks where the Effective Deadline of any of these Students falls within
 * the days from `from` to `to`, both included.
 */
export function tasksDueBetween(
  schedule: Schedule,
  taskIds: readonly string[],
  studentIds: readonly string[],
  from: number,
  to: number
) {
  const start = startOfDay(from);
  const end = shiftDays(startOfDay(to), 1);
  const students = (studentIds.length ? studentIds : STUDENTS.map((s) => s.id))
    .map((id) => studentsById.get(id))
    .filter((student) => student !== undefined);

  return taskIds.filter((taskId) =>
    students.some((student) => {
      const value = effectiveDeadline(schedule, taskId, student).value;
      return value.kind === 'at' && value.at >= start && value.at < end;
    })
  );
}

function byLabel(by: ExtendBy) {
  return by.kind === 'days' ? daysLabel(by.days) : `до ${formatDay(by.at)}`;
}

export function useExtendDraft(preset: ExtendPreset) {
  const schedule = useViewSchedule();
  const groups = useOrderedTasks();
  const edit = useScheduleEdit();

  const [studentIds, setStudentIds] = useState<readonly string[]>(
    preset.studentIds
  );
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set(preset.taskIds)
  );
  const [period, setPeriodText] = useState({ from: '', to: '' });
  const [by, setBy] = useState<ExtendBy>({ kind: 'days', days: 7 });
  const [reason, setReason] = useState('');

  const allTaskIds = useMemo(
    () => groups.flatMap(({ tasks }) => tasks.map((task) => task.id)),
    [groups]
  );

  const parsedFrom = parseMomentInput(period.from, '00:00');
  const parsedTo = parseMomentInput(period.to, '23:59');
  const from = parsedFrom.status === 'valid' ? parsedFrom.at : null;
  const to = parsedTo.status === 'valid' ? parsedTo.at : null;
  const range = from !== null && to !== null ? { from, to } : null;

  // A complete period chooses the Tasks; picking in the list takes over.
  const taskIds = useMemo<ReadonlySet<string>>(
    () =>
      from !== null && to !== null
        ? new Set(tasksDueBetween(schedule, allTaskIds, studentIds, from, to))
        : picked,
    [from, to, schedule, allTaskIds, studentIds, picked]
  );

  const orderedTaskIds = useMemo(
    () => allTaskIds.filter((id) => taskIds.has(id)),
    [allTaskIds, taskIds]
  );

  const plan = useMemo(
    () => planExtension(schedule, orderedTaskIds, studentIds, by, reason),
    [schedule, orderedTaskIds, studentIds, by, reason]
  );

  const flips = useMemo(
    () =>
      latenessChanges(
        schedule,
        applyCommands(schedule, plan.commands),
        ATTEMPTS.filter(
          (attempt) =>
            taskIds.has(attempt.taskId) &&
            studentIds.includes(attempt.studentId)
        ),
        STUDENTS
      ),
    [schedule, plan.commands, taskIds, studentIds]
  );

  const periodInvalid =
    parsedFrom.status === 'invalid' || parsedTo.status === 'invalid';

  const blocked =
    studentIds.length === 0
      ? 'Выберите хотя бы одного студента'
      : periodInvalid
        ? 'Период: формат 20.10'
        : range && range.from > range.to
          ? 'Период начинается позже, чем заканчивается'
          : orderedTaskIds.length === 0
            ? range
              ? 'В этот период у выбранных студентов нет дедлайнов'
              : 'Выберите хотя бы одну Task'
            : by.kind === 'days' && by.days === 0
              ? 'Выберите, на сколько продлить'
              : by.kind === 'days' && by.days < 0
                ? 'Продлить можно только на более поздний дедлайн'
                : plan.commands.length === 0
                  ? 'Ничего не изменится: дедлайна нет или он уже позже'
                  : null;

  function submit() {
    const who =
      studentIds.length === 1
        ? studentName(studentsById.get(studentIds[0]!)!)
        : `${studentIds.length} ${plural(studentIds.length, 'студент', 'студента', 'студентов')}`;
    edit(
      plan.commands,
      `продление ${byLabel(by)}: ${who}, ${orderedTaskIds.length} Task`
    );
  }

  return {
    groups,
    schedule,
    studentIds,
    setStudentIds,
    taskIds,
    setTaskIds: (next: ReadonlySet<string>) => {
      setPicked(next);
      setPeriodText({ from: '', to: '' });
    },
    orderedTaskIds,
    period,
    setPeriod: (from: string, to: string) => {
      // Leaving the period keeps the Tasks it found.
      if (range && !(from.trim() && to.trim())) {
        setPicked(taskIds);
      }
      setPeriodText({ from, to });
    },
    periodActive: range !== null,
    by,
    setBy,
    reason,
    setReason,
    plan,
    flips: flipsSentence(flips),
    flipsKind: flips.becameLate.length ? ('warn' as const) : ('good' as const),
    blocked,
    submit,
  };
}

export type ExtendDraft = ReturnType<typeof useExtendDraft>;
