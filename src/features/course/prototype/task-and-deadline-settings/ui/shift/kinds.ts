// PROTOTYPE (#181): the refined «Вопрос» window shifts kinds of deadlines
// chosen independently — general, Student Group, personal, opening time —
// instead of one scope. The Teacher's words: «общие», «подгрупп»,
// «индивидуальные дедлайны студентов».
import { useMemo, useState } from 'react';

import {
  applyCommands,
  findOverride,
  latenessChanges,
  overrideKey,
  sameValue,
  type DeadlineCommand,
  type DeadlineValue,
  type Schedule,
  type ShiftRow,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  ATTEMPTS,
  STUDENT_GROUPS,
  STUDENTS,
  useOrderedTasks,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { shiftDays } from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import {
  daysLabel,
  flipsSentence,
  inverseOf,
  movingRows,
  type ShiftPreset,
} from './model';

export type ShiftKinds = {
  general: boolean;
  groups: boolean;
  students: boolean;
  opening: boolean;
};

function moved(value: DeadlineValue, days: number): DeadlineValue {
  return value.kind === 'at'
    ? { kind: 'at', at: shiftDays(value.at, days) }
    : value;
}

function row(
  taskId: string,
  level: ShiftRow['level'],
  kind: ShiftRow['kind'],
  before: DeadlineValue,
  after: DeadlineValue,
  extra: Partial<ShiftRow> = {}
): ShiftRow {
  return {
    key: `${taskId}|${level}|${extra.target ? overrideKey(taskId, extra.target) : ''}`,
    taskId,
    level,
    kind,
    before,
    after,
    reason: '',
    excludable: false,
    included: true,
    equalsTaskDeadline: false,
    ...extra,
  };
}

/**
 * - general: the Task Deadline; Student Groups without their own deadline
 *   follow it;
 * - groups: chosen Student Groups — their own deadline moves; one that
 *   inherits gets its own deadline when the general one stays;
 * - students: every personal deadline with a date;
 * - opening: Task Opening Time.
 * «без дедлайна» never moves.
 */
export function planKinds(
  schedule: Schedule,
  taskIds: readonly string[],
  kinds: ShiftKinds,
  groupIds: ReadonlySet<string>,
  days: number
) {
  const rows: ShiftRow[] = [];
  const commands: DeadlineCommand[] = [];

  for (const taskId of taskIds) {
    const task = schedule.tasks[taskId];
    if (!task) {
      continue;
    }

    const general = task.deadline;
    const generalAfter = kinds.general ? moved(general, days) : general;

    if (kinds.general) {
      rows.push(
        row(
          taskId,
          'task',
          general.kind === 'at' ? 'shift' : 'no-deadline',
          general,
          generalAfter
        )
      );
      if (general.kind === 'at') {
        commands.push({
          type: 'set-task-deadline',
          taskId,
          value: generalAfter,
        });
      }
    }

    for (const group of STUDENT_GROUPS) {
      const target = { kind: 'group', groupId: group.id } as const;
      const override = findOverride(schedule, taskId, target);
      const chosen = kinds.groups && groupIds.has(group.id);

      if (!override) {
        if (general.kind !== 'at') {
          continue;
        }
        if (kinds.general) {
          rows.push(
            row(taskId, 'group', 'follows', general, generalAfter, { target })
          );
        } else if (chosen) {
          const after = moved(general, days);
          rows.push(
            row(taskId, 'group', 'create-override', general, after, { target })
          );
          commands.push({ type: 'set-override', taskId, target, value: after });
        }
        continue;
      }

      if (!chosen) {
        continue;
      }

      if (override.value.kind === 'none') {
        rows.push(
          row(taskId, 'group', 'no-deadline', override.value, override.value, {
            target,
            reason: override.reason,
          })
        );
        continue;
      }

      const after = moved(override.value, days);
      rows.push(
        row(taskId, 'group', 'shift', override.value, after, {
          target,
          reason: override.reason,
          equalsTaskDeadline: sameValue(after, generalAfter),
        })
      );
      commands.push({ type: 'set-override', taskId, target, value: after });
    }

    if (kinds.students) {
      for (const override of schedule.overrides) {
        if (override.taskId !== taskId || override.target.kind !== 'student') {
          continue;
        }
        const after = moved(override.value, days);
        rows.push(
          row(
            taskId,
            'student',
            override.value.kind === 'at' ? 'shift' : 'no-deadline',
            override.value,
            after,
            { target: override.target, reason: override.reason }
          )
        );
        if (override.value.kind === 'at') {
          commands.push({
            type: 'set-override',
            taskId,
            target: override.target,
            value: after,
          });
        }
      }
    }

    if (kinds.opening && task.openingTime !== null) {
      const before: DeadlineValue = { kind: 'at', at: task.openingTime };
      const after = moved(before, days) as { kind: 'at'; at: number };
      rows.push(row(taskId, 'opening', 'shift', before, after));
      commands.push({ type: 'set-opening-time', taskId, at: after.at });
    }
  }

  return { rows, commands };
}

export function useKindsDraft(preset: ShiftPreset) {
  const schedule = useViewSchedule();
  const groups = useOrderedTasks();
  const edit = useScheduleEdit();

  const [taskIds, setTaskIds] = useState<ReadonlySet<string>>(
    () => new Set(preset.taskIds)
  );
  const [days, setDays] = useState(preset.days ?? 7);
  const [kinds, setKinds] = useState<ShiftKinds>(() =>
    preset.groupIds?.length
      ? { general: false, groups: true, students: false, opening: false }
      : { general: true, groups: true, students: true, opening: false }
  );
  const [groupIds, setGroupIds] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        preset.groupIds?.length
          ? preset.groupIds
          : STUDENT_GROUPS.map((group) => group.id)
      )
  );

  const orderedTaskIds = useMemo(
    () =>
      groups.flatMap(({ tasks: items }) =>
        items.map((task) => task.id).filter((id) => taskIds.has(id))
      ),
    [groups, taskIds]
  );

  const plan = useMemo(
    () => planKinds(schedule, orderedTaskIds, kinds, groupIds, days),
    [schedule, orderedTaskIds, kinds, groupIds, days]
  );

  const flips = useMemo(
    () =>
      flipsSentence(
        latenessChanges(
          schedule,
          applyCommands(schedule, plan.commands),
          ATTEMPTS.filter((attempt) => taskIds.has(attempt.taskId)),
          STUDENTS
        )
      ),
    [schedule, plan.commands, taskIds]
  );

  const counts = {
    groups: movingRows(plan.rows).filter((item) => item.level === 'group')
      .length,
    students: movingRows(plan.rows).filter((item) => item.level === 'student')
      .length,
    personalTotal: schedule.overrides.filter(
      (item) =>
        orderedTaskIds.includes(item.taskId) &&
        item.target.kind === 'student' &&
        item.value.kind === 'at'
    ).length,
  };

  const hasOpening = orderedTaskIds.some(
    (id) => schedule.tasks[id]?.openingTime !== null
  );

  const blocked =
    orderedTaskIds.length === 0
      ? 'Выберите хотя бы одну Task'
      : !kinds.general && !kinds.groups && !kinds.students && !kinds.opening
        ? 'Отметьте, какие дедлайны сдвинуть'
        : days === 0
          ? 'Выберите, на сколько дней'
          : plan.commands.length === 0
            ? 'Ничего не изменится: у выбранного нет дат'
            : null;

  function submit() {
    edit(
      plan.commands,
      `сдвиг ${daysLabel(days)}: ${orderedTaskIds.length} Task`
    );
    return inverseOf(plan.rows);
  }

  return {
    schedule,
    groups,
    taskIds,
    setTaskIds,
    orderedTaskIds,
    days,
    setDays,
    kinds,
    setKind: (kind: keyof ShiftKinds, on: boolean) =>
      setKinds((previous) => ({ ...previous, [kind]: on })),
    groupIds,
    setGroupIds,
    plan,
    flips,
    counts,
    hasOpening,
    blocked,
    submit,
  };
}

export type KindsDraft = ReturnType<typeof useKindsDraft>;
