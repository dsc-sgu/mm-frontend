// PROTOTYPE (#181): the deadline model from the #42 spec as plain functions:
// Effective Deadline, lateness, edit commands, a diff for «было → стало»
// previews and the mass shift plan.
import { NOW, shiftDays } from './time';

export type DeadlineValue = { kind: 'at'; at: number } | { kind: 'none' };

export type OverrideTarget =
  | { kind: 'group'; groupId: string }
  | { kind: 'student'; studentId: string };

export type DeadlineOverride = {
  taskId: string;
  target: OverrideTarget;
  value: DeadlineValue;
  reason: string;
};

export type TaskSchedule = {
  deadline: DeadlineValue;
  /** Task Opening Time; null means time does not hold the Task back. */
  openingTime: number | null;
};

export type Schedule = {
  tasks: Record<string, TaskSchedule>;
  overrides: DeadlineOverride[];
};

export type StudentGroup = { id: string; name: string };

export type Student = {
  id: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  groupId: string;
};

export type Attempt = {
  id: string;
  taskId: string;
  studentId: string;
  submittedAt: number;
};

export type DeadlineSource = 'student' | 'group' | 'task';

export type ResolvedDeadline = {
  value: DeadlineValue;
  source: DeadlineSource;
  reason: string;
};

export function sameValue(a: DeadlineValue, b: DeadlineValue) {
  return a.kind === 'none'
    ? b.kind === 'none'
    : b.kind === 'at' && a.at === b.at;
}

export function targetKey(target: OverrideTarget) {
  return target.kind === 'group'
    ? `g:${target.groupId}`
    : `s:${target.studentId}`;
}

export function overrideKey(taskId: string, target: OverrideTarget) {
  return `${taskId}|${targetKey(target)}`;
}

export function findOverride(
  schedule: Schedule,
  taskId: string,
  target: OverrideTarget
) {
  const key = targetKey(target);
  return schedule.overrides.find(
    (item) => item.taskId === taskId && targetKey(item.target) === key
  );
}

export function groupDeadline(
  schedule: Schedule,
  taskId: string,
  groupId: string
): ResolvedDeadline {
  const override = findOverride(schedule, taskId, { kind: 'group', groupId });

  if (override) {
    return { value: override.value, source: 'group', reason: override.reason };
  }

  return {
    value: schedule.tasks[taskId]!.deadline,
    source: 'task',
    reason: '',
  };
}

/** The most specific value wins, even when it is stricter. */
export function effectiveDeadline(
  schedule: Schedule,
  taskId: string,
  student: Pick<Student, 'id' | 'groupId'>
): ResolvedDeadline {
  const personal = findOverride(schedule, taskId, {
    kind: 'student',
    studentId: student.id,
  });

  if (personal) {
    return {
      value: personal.value,
      source: 'student',
      reason: personal.reason,
    };
  }

  return groupDeadline(schedule, taskId, student.groupId);
}

export type Lateness =
  | { kind: 'on-time' }
  | { kind: 'late'; by: number }
  | { kind: 'no-deadline' };

export function lateness(submittedAt: number, value: DeadlineValue): Lateness {
  if (value.kind === 'none') {
    return { kind: 'no-deadline' };
  }

  return submittedAt > value.at
    ? { kind: 'late', by: submittedAt - value.at }
    : { kind: 'on-time' };
}

export function overrideCounts(schedule: Schedule, taskId: string) {
  let groups = 0;
  let students = 0;

  for (const item of schedule.overrides) {
    if (item.taskId !== taskId) {
      continue;
    }

    if (item.target.kind === 'group') {
      groups += 1;
    } else {
      students += 1;
    }
  }

  return { groups, students, total: groups + students };
}

// ---------------------------------------------------------------------------
// Commands

export type DeadlineCommand =
  | { type: 'set-task-deadline'; taskId: string; value: DeadlineValue }
  | { type: 'set-opening-time'; taskId: string; at: number | null }
  | {
      type: 'set-override';
      taskId: string;
      target: OverrideTarget;
      value: DeadlineValue;
      /** Undefined keeps the existing reason. */
      reason?: string;
    }
  | { type: 'reset-override'; taskId: string; target: OverrideTarget }
  | {
      type: 'set-reason';
      taskId: string;
      target: OverrideTarget;
      reason: string;
    };

export function applyCommand(
  schedule: Schedule,
  command: DeadlineCommand
): Schedule {
  switch (command.type) {
    case 'set-task-deadline': {
      const task = schedule.tasks[command.taskId]!;
      return {
        ...schedule,
        tasks: {
          ...schedule.tasks,
          [command.taskId]: { ...task, deadline: command.value },
        },
      };
    }
    case 'set-opening-time': {
      const task = schedule.tasks[command.taskId]!;
      return {
        ...schedule,
        tasks: {
          ...schedule.tasks,
          [command.taskId]: { ...task, openingTime: command.at },
        },
      };
    }
    case 'set-override': {
      const existing = findOverride(schedule, command.taskId, command.target);
      const next: DeadlineOverride = {
        taskId: command.taskId,
        target: command.target,
        value: command.value,
        reason: command.reason ?? existing?.reason ?? '',
      };
      return {
        ...schedule,
        overrides: existing
          ? schedule.overrides.map((item) => (item === existing ? next : item))
          : [...schedule.overrides, next],
      };
    }
    case 'reset-override': {
      const existing = findOverride(schedule, command.taskId, command.target);
      return existing
        ? {
            ...schedule,
            overrides: schedule.overrides.filter((item) => item !== existing),
          }
        : schedule;
    }
    case 'set-reason': {
      const existing = findOverride(schedule, command.taskId, command.target);
      return existing
        ? {
            ...schedule,
            overrides: schedule.overrides.map((item) =>
              item === existing ? { ...item, reason: command.reason } : item
            ),
          }
        : schedule;
    }
  }
}

export function applyCommands(
  schedule: Schedule,
  commands: readonly DeadlineCommand[]
) {
  return commands.reduce(applyCommand, schedule);
}

// ---------------------------------------------------------------------------
// «было → стало»

export type LevelValue = DeadlineValue | { kind: 'inherit' };

export type ScheduleChange = {
  key: string;
  taskId: string;
  level: 'task' | 'opening' | 'group' | 'student';
  target?: OverrideTarget;
  before: LevelValue;
  after: LevelValue;
  reasonBefore: string;
  reasonAfter: string;
};

function openingValue(at: number | null): DeadlineValue {
  return at === null ? { kind: 'none' } : { kind: 'at', at };
}

function sameLevel(a: LevelValue, b: LevelValue) {
  if (a.kind === 'inherit' || b.kind === 'inherit') {
    return a.kind === b.kind;
  }

  return sameValue(a, b);
}

export function diffSchedules(
  before: Schedule,
  after: Schedule
): ScheduleChange[] {
  const changes: ScheduleChange[] = [];

  for (const [taskId, next] of Object.entries(after.tasks)) {
    const previous = before.tasks[taskId];

    if (!previous) {
      continue;
    }

    if (!sameValue(previous.deadline, next.deadline)) {
      changes.push({
        key: `${taskId}|task`,
        taskId,
        level: 'task',
        before: previous.deadline,
        after: next.deadline,
        reasonBefore: '',
        reasonAfter: '',
      });
    }

    if (previous.openingTime !== next.openingTime) {
      changes.push({
        key: `${taskId}|opening`,
        taskId,
        level: 'opening',
        before: openingValue(previous.openingTime),
        after: openingValue(next.openingTime),
        reasonBefore: '',
        reasonAfter: '',
      });
    }
  }

  const keys = new Map<string, Pick<DeadlineOverride, 'taskId' | 'target'>>();
  for (const item of [...before.overrides, ...after.overrides]) {
    keys.set(overrideKey(item.taskId, item.target), item);
  }

  for (const [key, { taskId, target }] of keys) {
    const previous = findOverride(before, taskId, target);
    const next = findOverride(after, taskId, target);
    const beforeValue: LevelValue = previous?.value ?? { kind: 'inherit' };
    const afterValue: LevelValue = next?.value ?? { kind: 'inherit' };

    if (
      sameLevel(beforeValue, afterValue) &&
      (previous?.reason ?? '') === (next?.reason ?? '')
    ) {
      continue;
    }

    changes.push({
      key,
      taskId,
      level: target.kind,
      target,
      before: beforeValue,
      after: afterValue,
      reasonBefore: previous?.reason ?? '',
      reasonAfter: next?.reason ?? '',
    });
  }

  return changes;
}

export type LatenessChange = {
  attempt: Attempt;
  before: Lateness;
  after: Lateness;
};

/** Attempts whose late / on-time status flips between two schedules. */
export function latenessChanges(
  before: Schedule,
  after: Schedule,
  attempts: readonly Attempt[],
  students: readonly Student[]
) {
  const byId = new Map(students.map((student) => [student.id, student]));
  const becameLate: LatenessChange[] = [];
  const becameOnTime: LatenessChange[] = [];

  for (const attempt of attempts) {
    const student = byId.get(attempt.studentId);

    if (!student) {
      continue;
    }

    const was = lateness(
      attempt.submittedAt,
      effectiveDeadline(before, attempt.taskId, student).value
    );
    const will = lateness(
      attempt.submittedAt,
      effectiveDeadline(after, attempt.taskId, student).value
    );
    const wasLate = was.kind === 'late';
    const willBeLate = will.kind === 'late';

    if (!wasLate && willBeLate) {
      becameLate.push({ attempt, before: was, after: will });
    }

    if (wasLate && !willBeLate) {
      becameOnTime.push({ attempt, before: was, after: will });
    }
  }

  return { becameLate, becameOnTime };
}

/** Students whose Effective Deadline comes before the Task Opening Time. */
export function openingAfterDeadline(
  schedule: Schedule,
  taskId: string,
  openingTime: number | null,
  students: readonly Student[]
) {
  if (openingTime === null) {
    return { task: false, students: 0 };
  }

  const task = schedule.tasks[taskId]!;
  const taskConflict =
    task.deadline.kind === 'at' && task.deadline.at < openingTime;
  const count = students.filter((student) => {
    const { value } = effectiveDeadline(schedule, taskId, student);
    return value.kind === 'at' && value.at < openingTime;
  }).length;

  return { task: taskConflict, students: count };
}

export function isTaskOpen(openingTime: number | null) {
  return openingTime === null || openingTime <= NOW;
}

// ---------------------------------------------------------------------------
// Mass shift

export type ShiftRecipients =
  | { kind: 'course' }
  | { kind: 'groups'; groupIds: string[] };

export type ShiftInput = {
  taskIds: readonly string[];
  recipients: ShiftRecipients;
  days: number;
  includeOpening: boolean;
  excluded: ReadonlySet<string>;
};

export type ShiftRowKind =
  /** The value moves by N days. */
  | 'shift'
  /** An inheriting Student Group gets its own Deadline Override. */
  | 'create-override'
  /** An inheriting Student Group follows the shifted Task Deadline. */
  | 'follows'
  /** «без дедлайна» never moves. */
  | 'no-deadline'
  /** Task Opening Time is per Task; group-only shifts cannot move it. */
  | 'opening-course-only';

export type ShiftRow = {
  key: string;
  taskId: string;
  level: 'task' | 'opening' | 'group' | 'student';
  target?: OverrideTarget;
  kind: ShiftRowKind;
  before: DeadlineValue;
  after: DeadlineValue;
  reason: string;
  excludable: boolean;
  included: boolean;
  /** The shifted override lands on the Task Deadline but stays explicit. */
  equalsTaskDeadline: boolean;
};

function shiftValue(value: DeadlineValue, days: number): DeadlineValue {
  return value.kind === 'at'
    ? { kind: 'at', at: shiftDays(value.at, days) }
    : value;
}

export function planShift(
  schedule: Schedule,
  input: ShiftInput,
  groups: readonly StudentGroup[],
  students: readonly Student[]
) {
  const rows: ShiftRow[] = [];
  const commands: DeadlineCommand[] = [];
  const studentGroup = new Map(students.map((item) => [item.id, item.groupId]));
  const selectedGroups =
    input.recipients.kind === 'course'
      ? new Set(groups.map((group) => group.id))
      : new Set(input.recipients.groupIds);

  for (const taskId of input.taskIds) {
    const task = schedule.tasks[taskId];

    if (!task) {
      continue;
    }

    const shiftedTaskDeadline =
      input.recipients.kind === 'course'
        ? shiftValue(task.deadline, input.days)
        : task.deadline;

    if (input.recipients.kind === 'course') {
      rows.push({
        key: `${taskId}|task`,
        taskId,
        level: 'task',
        kind: task.deadline.kind === 'at' ? 'shift' : 'no-deadline',
        before: task.deadline,
        after: shiftedTaskDeadline,
        reason: '',
        excludable: false,
        included: true,
        equalsTaskDeadline: false,
      });

      if (task.deadline.kind === 'at') {
        commands.push({
          type: 'set-task-deadline',
          taskId,
          value: shiftedTaskDeadline,
        });
      }
    }

    for (const group of groups) {
      if (!selectedGroups.has(group.id)) {
        continue;
      }

      const target: OverrideTarget = { kind: 'group', groupId: group.id };
      const key = overrideKey(taskId, target);
      const override = findOverride(schedule, taskId, target);

      if (!override) {
        if (task.deadline.kind === 'none') {
          continue;
        }

        const creates = input.recipients.kind === 'groups';
        const after = shiftValue(task.deadline, input.days);
        rows.push({
          key,
          taskId,
          level: 'group',
          target,
          kind: creates ? 'create-override' : 'follows',
          before: task.deadline,
          after,
          reason: '',
          excludable: false,
          included: true,
          equalsTaskDeadline: false,
        });

        if (creates) {
          commands.push({ type: 'set-override', taskId, target, value: after });
        }

        continue;
      }

      if (override.value.kind === 'none') {
        rows.push({
          key,
          taskId,
          level: 'group',
          target,
          kind: 'no-deadline',
          before: override.value,
          after: override.value,
          reason: override.reason,
          excludable: false,
          included: false,
          equalsTaskDeadline: false,
        });
        continue;
      }

      const excludable = input.recipients.kind === 'course';
      const included = !excludable || !input.excluded.has(key);
      const after = shiftValue(override.value, input.days);
      rows.push({
        key,
        taskId,
        level: 'group',
        target,
        kind: 'shift',
        before: override.value,
        after: included ? after : override.value,
        reason: override.reason,
        excludable,
        included,
        equalsTaskDeadline: included && sameValue(after, shiftedTaskDeadline),
      });

      if (included) {
        commands.push({ type: 'set-override', taskId, target, value: after });
      }
    }

    for (const override of schedule.overrides) {
      if (
        override.taskId !== taskId ||
        override.target.kind !== 'student' ||
        !selectedGroups.has(studentGroup.get(override.target.studentId) ?? '')
      ) {
        continue;
      }

      const key = overrideKey(taskId, override.target);

      if (override.value.kind === 'none') {
        rows.push({
          key,
          taskId,
          level: 'student',
          target: override.target,
          kind: 'no-deadline',
          before: override.value,
          after: override.value,
          reason: override.reason,
          excludable: false,
          included: false,
          equalsTaskDeadline: false,
        });
        continue;
      }

      const included = !input.excluded.has(key);
      const after = shiftValue(override.value, input.days);
      rows.push({
        key,
        taskId,
        level: 'student',
        target: override.target,
        kind: 'shift',
        before: override.value,
        after: included ? after : override.value,
        reason: override.reason,
        excludable: true,
        included,
        equalsTaskDeadline: false,
      });

      if (included) {
        commands.push({
          type: 'set-override',
          taskId,
          target: override.target,
          value: after,
        });
      }
    }

    if (input.includeOpening && task.openingTime !== null) {
      const before: DeadlineValue = { kind: 'at', at: task.openingTime };

      if (input.recipients.kind === 'groups') {
        rows.push({
          key: `${taskId}|opening`,
          taskId,
          level: 'opening',
          kind: 'opening-course-only',
          before,
          after: before,
          reason: '',
          excludable: false,
          included: false,
          equalsTaskDeadline: false,
        });
      } else {
        const after = shiftValue(before, input.days) as {
          kind: 'at';
          at: number;
        };
        rows.push({
          key: `${taskId}|opening`,
          taskId,
          level: 'opening',
          kind: 'shift',
          before,
          after,
          reason: '',
          excludable: false,
          included: true,
          equalsTaskDeadline: false,
        });
        commands.push({ type: 'set-opening-time', taskId, at: after.at });
      }
    }
  }

  return { rows, commands };
}
