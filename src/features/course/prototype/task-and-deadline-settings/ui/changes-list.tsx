// PROTOTYPE (#181): «было → стало» list of schedule changes.
import { X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { studentName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  groupDeadline,
  type DeadlineValue,
  type Schedule,
  type ScheduleChange,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  STUDENT_GROUPS,
  STUDENTS,
  useSandbox,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { ValueChange } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));

function inheritedValue(
  schedule: Schedule,
  change: ScheduleChange
): DeadlineValue | undefined {
  if (change.target?.kind === 'group') {
    return schedule.tasks[change.taskId]?.deadline;
  }

  if (change.target?.kind === 'student') {
    const student = studentsById.get(change.target.studentId);
    return student
      ? groupDeadline(schedule, change.taskId, student.groupId).value
      : undefined;
  }

  return undefined;
}

function changeTarget(change: ScheduleChange) {
  switch (change.level) {
    case 'task':
      return 'общий срок';
    case 'opening':
      return 'Task Opening Time';
    case 'group': {
      const groupId =
        change.target?.kind === 'group' ? change.target.groupId : '';
      return `группа ${STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId}`;
    }
    case 'student': {
      const student =
        change.target?.kind === 'student'
          ? studentsById.get(change.target.studentId)
          : undefined;
      return student ? `личное, ${studentName(student)}` : 'личное';
    }
  }
}

export function ChangesList({
  changes,
  before,
  after,
  onRevert,
}: {
  changes: ScheduleChange[];
  before: Schedule;
  after: Schedule;
  onRevert?: (key: string) => void;
}) {
  const tasks = useSandbox((state) => state.tasks);

  return (
    <ul className="divide-y text-sm">
      {changes.map((change) => {
        const reasonChanged = change.reasonBefore !== change.reasonAfter;
        return (
          <li key={change.key} className="flex items-start gap-2 px-3 py-1.5">
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="truncate">
                <span className="font-medium">
                  {tasks[change.taskId]?.title}
                </span>{' '}
                <span className="text-muted-foreground">
                  · {changeTarget(change)}
                </span>
              </span>
              <ValueChange
                before={change.before}
                after={change.after}
                inheritedBefore={inheritedValue(before, change)}
                inheritedAfter={inheritedValue(after, change)}
                defaultTime={change.level === 'opening' ? '00:00' : '23:59'}
              />
              {reasonChanged && change.after.kind !== 'inherit' ? (
                <span className="text-xs text-muted-foreground">
                  Причина: {change.reasonAfter || '—'}
                </span>
              ) : null}
            </span>
            {onRevert ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Отменить эту правку"
                onClick={() => onRevert(change.key)}
              >
                <X />
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
