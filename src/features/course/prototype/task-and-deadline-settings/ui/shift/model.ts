// PROTOTYPE (#181): shared state of the simpler mass-shift windows. Instead
// of a checkbox per Deadline Override they offer three scopes: everything,
// only the Task Deadline, or chosen Student Groups.
import { useMemo, useState } from 'react';

import {
  applyCommands,
  groupDeadline,
  latenessChanges,
  overrideKey,
  planShift,
  type DeadlineCommand,
  type LatenessChange,
  type Schedule,
  type ShiftRow,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  ATTEMPTS,
  STUDENT_GROUPS,
  STUDENTS,
  useOrderedTasks,
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { NOW } from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';

export type ShiftPreset = {
  taskIds: string[];
  days?: number;
  groupIds?: string[];
};

export type ShiftScope = 'everything' | 'general-only' | 'groups';

export function plural(count: number, one: string, few: string, many: string) {
  const abs = Math.abs(count);
  if (abs % 10 === 1 && abs % 100 !== 11) {
    return one;
  }
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) {
    return few;
  }
  return many;
}

export function daysLabel(days: number) {
  if (days === 0) {
    return 'без сдвига';
  }

  const abs = Math.abs(days);
  return `на ${abs} ${plural(abs, 'день', 'дня', 'дней')} ${days > 0 ? 'позже' : 'раньше'}`;
}

export function groupName(groupId: string) {
  return STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;
}

export function toggleIn<T>(set: ReadonlySet<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

/** Tasks whose deadline for this Student Group is still ahead. */
export function upcomingForGroup(
  schedule: Schedule,
  taskIds: readonly string[],
  groupId: string
) {
  return taskIds.filter((taskId) => {
    const value = groupDeadline(schedule, taskId, groupId).value;
    return value.kind === 'at' && value.at > NOW;
  });
}

/** Values that actually move, for counts and summaries. */
export function movingRows(rows: readonly ShiftRow[]) {
  return rows.filter(
    (row) =>
      row.included && (row.kind === 'shift' || row.kind === 'create-override')
  );
}

/** Commands that put every moved value back, for «Отменить». */
export function inverseOf(rows: readonly ShiftRow[]): DeadlineCommand[] {
  return movingRows(rows).map((row): DeadlineCommand => {
    if (row.kind === 'create-override' && row.target) {
      return { type: 'reset-override', taskId: row.taskId, target: row.target };
    }
    if (row.level === 'opening') {
      return {
        type: 'set-opening-time',
        taskId: row.taskId,
        at: row.before.kind === 'at' ? row.before.at : null,
      };
    }
    if (row.level === 'task' || !row.target) {
      return {
        type: 'set-task-deadline',
        taskId: row.taskId,
        value: row.before,
      };
    }
    return {
      type: 'set-override',
      taskId: row.taskId,
      target: row.target,
      value: row.before,
    };
  });
}

export function planFor(
  schedule: Schedule,
  taskIds: readonly string[],
  scope: ShiftScope,
  groupIds: ReadonlySet<string>,
  days: number,
  includeOpening: boolean,
  excludedExtra: ReadonlySet<string>
) {
  const allOverrides = new Set(
    schedule.overrides
      .filter((item) => taskIds.includes(item.taskId))
      .map((item) => overrideKey(item.taskId, item.target))
  );

  return planShift(
    schedule,
    {
      taskIds,
      recipients:
        scope === 'groups'
          ? { kind: 'groups', groupIds: [...groupIds] }
          : { kind: 'course' },
      days,
      includeOpening: scope === 'groups' ? false : includeOpening,
      excluded: scope === 'general-only' ? allOverrides : excludedExtra,
    },
    STUDENT_GROUPS,
    STUDENTS
  );
}

export function useShiftDraft(preset: ShiftPreset) {
  const schedule = useViewSchedule();
  const groups = useOrderedTasks();
  const edit = useScheduleEdit();

  const [taskIds, setTaskIds] = useState<ReadonlySet<string>>(
    () => new Set(preset.taskIds)
  );
  const [scope, setScope] = useState<ShiftScope>(
    preset.groupIds?.length ? 'groups' : 'everything'
  );
  const [groupIds, setGroupIds] = useState<ReadonlySet<string>>(
    () => new Set(preset.groupIds ?? [])
  );
  const [days, setDays] = useState(preset.days ?? 7);
  const [includeOpening, setIncludeOpening] = useState(false);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());

  const orderedTaskIds = useMemo(
    () =>
      groups.flatMap(({ tasks }) =>
        tasks.map((task) => task.id).filter((id) => taskIds.has(id))
      ),
    [groups, taskIds]
  );

  const plan = useMemo(
    () =>
      planFor(
        schedule,
        orderedTaskIds,
        scope,
        groupIds,
        days,
        includeOpening,
        excluded
      ),
    [schedule, orderedTaskIds, scope, groupIds, days, includeOpening, excluded]
  );

  /** What each scope would move, for the «Вопрос» answers. */
  const scopePlans = useMemo(
    () => ({
      everything: planFor(
        schedule,
        orderedTaskIds,
        'everything',
        groupIds,
        days,
        includeOpening,
        new Set()
      ),
      'general-only': planFor(
        schedule,
        orderedTaskIds,
        'general-only',
        groupIds,
        days,
        includeOpening,
        new Set()
      ),
    }),
    [schedule, orderedTaskIds, groupIds, days, includeOpening]
  );

  const flips = useMemo(
    () =>
      latenessChanges(
        schedule,
        applyCommands(schedule, plan.commands),
        ATTEMPTS.filter((attempt) => taskIds.has(attempt.taskId)),
        STUDENTS
      ),
    [schedule, plan.commands, taskIds]
  );

  const changing = movingRows(plan.rows).length;
  const hasOpening = orderedTaskIds.some(
    (taskId) => schedule.tasks[taskId]?.openingTime !== null
  );
  const canApply =
    plan.commands.length > 0 &&
    days !== 0 &&
    (scope !== 'groups' || groupIds.size > 0);

  function label() {
    const who =
      scope === 'groups'
        ? [...groupIds].map(groupName).join(', ')
        : scope === 'general-only'
          ? 'только общий дедлайн'
          : 'весь Course';
    return `сдвиг ${daysLabel(days)}: ${orderedTaskIds.length} Task, ${who}`;
  }

  /** Applies the plan; returns the commands that undo it. */
  function submit() {
    edit(plan.commands, label());
    return inverseOf(plan.rows);
  }

  return {
    groups,
    taskIds,
    setTaskIds,
    orderedTaskIds,
    scope,
    setScope,
    groupIds,
    setGroupIds,
    days,
    setDays,
    includeOpening,
    setIncludeOpening,
    excluded,
    setExcluded,
    plan,
    scopePlans,
    flips,
    changing,
    hasOpening,
    canApply,
    label,
    submit,
  };
}

export type ShiftDraft = ReturnType<typeof useShiftDraft>;

export function taskSummary(draft: { orderedTaskIds: readonly string[] }) {
  const tasks = useSandbox.getState().tasks;
  const ids = draft.orderedTaskIds;

  if (ids.length === 0) {
    return 'выберите Task';
  }

  if (ids.length === 1) {
    return `«${tasks[ids[0]!]?.title}»`;
  }

  return `${ids.length} Task`;
}

/** One sentence about Attempts whose lateness flips, or nothing. */
export function flipsSentence(flips: {
  becameLate: LatenessChange[];
  becameOnTime: LatenessChange[];
}) {
  const onTime = flips.becameOnTime.length;
  const late = flips.becameLate.length;
  const parts = [
    onTime
      ? `${onTime} ${plural(onTime, 'сдача перестанет быть опоздавшей', 'сдачи перестанут быть опоздавшими', 'сдач перестанут быть опоздавшими')}`
      : null,
    late
      ? `${late} ${plural(late, 'сдача станет опоздавшей', 'сдачи станут опоздавшими', 'сдач станут опоздавшими')}`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : null;
}
