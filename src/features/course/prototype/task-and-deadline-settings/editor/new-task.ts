// PROTOTYPE (#181): a Task Reference inserted from the slash menu carries
// this placeholder; the prototype turns it into a new Task with the block id.
import type { TaskSchedule } from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';

export const NEW_TASK_ID = '__new__';

/** «Создать ещё»: inserts a Task Reference after the given Task's one. */
export const insertAfterTask = new Map<string, () => void>();

/** What the next new Task carries over from the previous one. */
let carry: { from: string; schedule: TaskSchedule } | null = null;

export function setCarry(next: typeof carry) {
  carry = next;
}

export function takeCarry() {
  const value = carry;
  carry = null;
  return value;
}

/** Why a new Task can't be created now, or null when it can (#180). */
export function useTaskCreationBlock() {
  const courseAccess = useSandbox((state) => state.courseAccess);
  return courseAccess === 'open'
    ? 'Курс открыт: новые задания создаются, только пока курс в подготовке'
    : null;
}
