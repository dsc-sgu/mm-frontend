// PROTOTYPE (#181): every schedule edit goes through `?apply=`: instant saves
// each value at once, batch queues it for «Применить» with a preview.
// Under `?taskApply=contract` a new Task's values go to the Course draft.
import { useCallback } from 'react';

import type { DeadlineCommand } from './schedule';
import { usePrototypeSettings } from './search';
import { newTasksInDraft } from './settings';
import { useSandbox } from './store';

export function useScheduleEdit() {
  const { apply, taskApply } = usePrototypeSettings();
  const queue = useSandbox((state) => state.queue);
  const saveSchedule = useSandbox((state) => state.saveSchedule);
  const writeDraftSchedule = useSandbox((state) => state.writeDraftSchedule);

  return useCallback(
    (commands: DeadlineCommand[], label: string) => {
      if (commands.length === 0) {
        return;
      }

      // `?taskApply=contract`: a new Task's schedule belongs to the Course
      // Draft Snapshot until it is published; there is no Task to apply to.
      const newTaskIds = new Set(useSandbox.getState().newTaskIds);
      const inDraft = newTasksInDraft(taskApply)
        ? commands.filter((command) => newTaskIds.has(command.taskId))
        : [];
      const applied = commands.filter((command) => !inDraft.includes(command));

      writeDraftSchedule(inDraft, label);

      if (applied.length === 0) {
        return;
      }

      if (apply === 'batch') {
        queue(applied);
      } else {
        void saveSchedule(applied, label);
      }
    },
    [apply, queue, saveSchedule, taskApply, writeDraftSchedule]
  );
}
