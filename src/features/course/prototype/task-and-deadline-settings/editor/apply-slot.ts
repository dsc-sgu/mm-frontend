// PROTOTYPE (#181): `taskApply: contract` and `blocks` hook into «Применить»
// of the Course Page editor: publishing the page creates and deletes Tasks
// and Task Groups in the same operation, and an unfinished new Task stops
// it. Under `blocks` the page goes as block drafts merged with what others
// published meanwhile; a conflict stops it.
import { createElement, useMemo, useRef } from 'react';
import { toast } from 'sonner';

import type { CourseContentBlockItem } from '@/features/course/features/page/model/types';
import {
  draftTaskChanges,
  hasTaskChanges,
  missingForPublish,
  pageTaskIdsOf,
  quoteTitles,
  type DraftTaskChanges,
} from '@/features/course/prototype/task-and-deadline-settings/contract';
import { OTHER_TEACHER } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import type { PrototypePageEditSlot } from '@/features/course/prototype/task-and-deadline-settings/page-edit-slot';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import { BlockDraftSync, BlockMark } from './block-drafts';
import { PageTaskSync } from './draft-strip';

/** False when the Task References of the page cannot be published. */
function checkTaskReferences(
  content: CourseContentBlockItem[],
  onOpenTask: (taskId: string) => void
) {
  const state = useSandbox.getState();
  const changes = draftTaskChanges(state, pageTaskIdsOf(content));

  if (changes.unavailable.length > 0) {
    toast.error(
      'На странице блок удалённого задания. Удалите его, чтобы опубликовать курс.'
    );
    return false;
  }

  if (changes.duplicated.length > 0) {
    toast.error(
      `${quoteTitles(changes.duplicated)} стоит на странице дважды. Копию блока задания вставить нельзя (#180): уберите лишний блок.`
    );
    return false;
  }

  if (state.courseAccess === 'open' && changes.deleted.length > 0) {
    toast.error(
      `Курс открыт: задания не удаляются, только перемещаются. Верните ${quoteTitles(changes.deleted)} — Ctrl+Z.`
    );
    return false;
  }

  for (const task of changes.created) {
    const missing = missingForPublish(task, state);

    if (missing.length > 0) {
      toast.error(
        `Новое задание ${quoteTitles([task])}: заполните ${missing.join(', ')}. В черновике оно может быть незаконченным, опубликовать — нет.`
      );
      onOpenTask(task.id);
      return false;
    }
  }

  return true;
}

export function useContractPageEditSlot(
  onOpenTask: (taskId: string) => void
): PrototypePageEditSlot {
  return useMemo(
    () => ({
      render: () => createElement(PageTaskSync),

      beforeApply: (content) =>
        checkTaskReferences(content, onOpenTask) ? content : null,

      afterApply: async (content) => {
        const changes = await useSandbox
          .getState()
          .publishCourseWithTasks(pageTaskIdsOf(content));

        if (hasTaskChanges(changes)) {
          toast.success(summary(changes));
        }
      },
    }),
    [onOpenTask]
  );
}

export function useBlocksPageEditSlot(
  onOpenTask: (taskId: string) => void
): PrototypePageEditSlot {
  // What «Применить» kept of the other Teacher's publication, for the log.
  const theirsKept = useRef<string[]>([]);

  return useMemo(
    () => ({
      render: () => [
        createElement(PageTaskSync, { key: 'tasks' }),
        createElement(BlockDraftSync, { key: 'blocks' }),
      ],

      beforeApply: (content) => {
        if (!checkTaskReferences(content, onOpenTask)) {
          return null;
        }

        const outcome = useSandbox.getState().mergeBlockDrafts(content);

        if (outcome.status === 'conflict') {
          toast.error(
            `Курс не опубликован: ${outcome.conflicts.length === 1 ? 'один блок' : `блоки (${outcome.conflicts.length})`} изменили и вы, и ${OTHER_TEACHER.shortName}. Решите конфликт в полосе над документом.`
          );
          return null;
        }

        theirsKept.current = outcome.theirsKept;
        return outcome.theirsKept.length > 0 ? outcome.content : content;
      },

      afterApply: async (content) => {
        const sandbox = useSandbox.getState();
        const pageTaskIds = pageTaskIdsOf(content);

        if (hasTaskChanges(draftTaskChanges(sandbox, pageTaskIds))) {
          await sandbox.publishCourseWithTasks(pageTaskIds);
        }

        const kept = theirsKept.current;
        theirsKept.current = [];
        sandbox.finishBlockPublish(content, kept);

        if (kept.length > 0) {
          toast.success(
            `Слито с публикацией ${OTHER_TEACHER.shortName}: его правки в ${kept.length} ${blocksWord(kept.length)} сохранены`
          );
        }
      },

      blockMark: (blockId) => createElement(BlockMark, { blockId }),
    }),
    [onOpenTask]
  );
}

function blocksWord(count: number) {
  return count === 1 ? 'блоке' : 'блоках';
}

function summary(changes: DraftTaskChanges) {
  return [
    changes.created.length
      ? `Создано заданий: ${changes.created.length}`
      : null,
    changes.deleted.length ? `удалено: ${changes.deleted.length}` : null,
    'вместе со страницей',
  ]
    .filter(Boolean)
    .join(', ');
}
