// PROTOTYPE (#181): how a schedule change is named in previews.
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
} from '@/features/course/prototype/task-and-deadline-settings/store';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));

/** What an inheriting level currently resolves to, for pale previews. */
export function inheritedValue(
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

export function changeTarget(change: ScheduleChange) {
  switch (change.level) {
    case 'task':
      return 'Общий дедлайн';
    case 'opening':
      return 'Открытие';
    case 'group': {
      const groupId =
        change.target?.kind === 'group' ? change.target.groupId : '';
      return (
        STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId
      );
    }
    case 'student': {
      const student =
        change.target?.kind === 'student'
          ? studentsById.get(change.target.studentId)
          : undefined;
      return student ? studentName(student) : 'Student';
    }
  }
}
