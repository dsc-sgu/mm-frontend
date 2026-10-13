// PROTOTYPE (#181): `?taskApply=contract` hooks into «Применить» of the
// Course Page editor: publishing the page creates and deletes Tasks and Task
// Groups in the same operation, and an unfinished new Task stops it.
import { createElement, useMemo } from 'react';
import { toast } from 'sonner';

import {
  draftTaskChanges,
  hasTaskChanges,
  missingForPublish,
  pageTaskIdsOf,
  quoteTitles,
  type DraftTaskChanges,
} from '@/features/course/prototype/task-and-deadline-settings/contract';
import type { PrototypePageEditSlot } from '@/features/course/prototype/task-and-deadline-settings/page-edit-slot';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import { PageTaskSync } from './draft-strip';

export function useContractPageEditSlot(
  onOpenTask: (taskId: string) => void
): PrototypePageEditSlot {
  return useMemo(
    () => ({
      render: () => createElement(PageTaskSync),

      beforeApply: (content) => {
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
      },

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
