// PROTOTYPE (#181): `?taskApply=contract` — the backend contract from #129.
// A published Task is edited apart from the Course Page; the Course Draft
// Snapshot holds only its `taskId`. A new Task belongs to the draft until it
// is published, and publishing the draft creates and deletes Tasks and Task
// Groups in one operation.
import type { CourseContentBlockItem } from '@/features/course/features/page/model/types';
import { NEW_TASK_ID } from './editor/new-task';
import type { Task, TaskGroup } from './fixture';
import { validateKey } from './panel/task-key';

export type DraftTaskChanges = {
  /** New Tasks whose Task Reference is on the page: created at publish. */
  created: Task[];
  /** New Tasks whose Task Reference was removed again: dropped unseen. */
  dropped: Task[];
  /** Published Tasks whose Task Reference is gone: deleted at publish. */
  deleted: Task[];
  /** Task Groups that appear together with their first Task. */
  groupsCreated: TaskGroup[];
  /** Task Groups that lose their last Task. */
  groupsRemoved: TaskGroup[];
  /** Task References to Tasks that no longer exist, e.g. after Ctrl+Z. */
  unavailable: string[];
  /** Tasks referenced twice: a copy of a Task Reference is not allowed. */
  duplicated: Task[];
};

/**
 * The `taskId`s the Course Draft Snapshot holds: its Task References. A
 * freshly inserted one names its new Task by the block id.
 */
export function pageTaskIdsOf(
  content: readonly CourseContentBlockItem[]
): string[] {
  return content.flatMap((block) => {
    if (block.type === 'assignment') {
      return [block.taskId === NEW_TASK_ID ? block.id : block.taskId];
    }
    return block.type === 'spoiler' ? pageTaskIdsOf(block.children) : [];
  });
}

type TaskWorld = {
  tasks: Record<string, Task>;
  taskGroups: TaskGroup[];
  newTaskIds: string[];
  removedTaskIds: string[];
};

export function draftTaskChanges(
  world: TaskWorld,
  pageTaskIds: readonly string[]
): DraftTaskChanges {
  const onPage = new Set(pageTaskIds);
  const isNew = new Set(world.newTaskIds);
  const changes: DraftTaskChanges = {
    created: [],
    dropped: [],
    deleted: [],
    groupsCreated: [],
    groupsRemoved: [],
    unavailable: pageTaskIds.filter((taskId) =>
      world.removedTaskIds.includes(taskId)
    ),
    duplicated: [
      ...new Set(
        pageTaskIds.filter(
          (taskId, index) => pageTaskIds.indexOf(taskId) !== index
        )
      ),
    ]
      .map((taskId) => world.tasks[taskId])
      .filter((task): task is Task => Boolean(task)),
  };

  for (const group of world.taskGroups) {
    const members = group.taskIds
      .map((taskId) => world.tasks[taskId])
      .filter((task): task is Task => Boolean(task));

    for (const task of members) {
      if (isNew.has(task.id)) {
        (onPage.has(task.id) ? changes.created : changes.dropped).push(task);
      } else if (!onPage.has(task.id)) {
        changes.deleted.push(task);
      }
    }

    const hadPublished = members.some((task) => !isNew.has(task.id));
    const staying = members.filter((task) => onPage.has(task.id));

    if (!hadPublished && staying.length > 0) {
      changes.groupsCreated.push(group);
    } else if (hadPublished && staying.length === 0) {
      changes.groupsRemoved.push(group);
    }
  }

  return changes;
}

/** A draft may hold an unfinished Task; publishing it may not (#113). */
export function missingForPublish(
  task: Task,
  world: Pick<TaskWorld, 'tasks' | 'taskGroups'>
) {
  const taken = (
    world.taskGroups.find((group) => group.id === task.groupId)?.taskIds ?? []
  )
    .filter((taskId) => taskId !== task.id)
    .map((taskId) => world.tasks[taskId]?.key.toLowerCase() ?? '');
  const missing: string[] = [];

  if (!task.title.trim()) {
    missing.push('название');
  }
  if (validateKey(task.key, taken)) {
    missing.push('ключ');
  }
  if (task.maxGrade === null) {
    missing.push('максимальный балл');
  }

  return missing;
}

export function hasTaskChanges(changes: DraftTaskChanges) {
  return (
    changes.created.length > 0 ||
    changes.deleted.length > 0 ||
    changes.groupsCreated.length > 0 ||
    changes.groupsRemoved.length > 0 ||
    changes.duplicated.length > 0 ||
    changes.unavailable.length > 0
  );
}

export function quoteTitles(tasks: readonly { title: string }[]) {
  return tasks.map((task) => `«${task.title || 'Без названия'}»`).join(', ');
}
