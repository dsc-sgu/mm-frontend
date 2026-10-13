// PROTOTYPE (#181): every schedule edit goes through `?apply=`: instant saves
// each value at once, batch queues it for «Применить» with a preview.
import { useCallback } from 'react';

import type { DeadlineCommand } from './schedule';
import { usePrototypeSettings } from './search';
import { useSandbox } from './store';

export function useScheduleEdit() {
  const { apply } = usePrototypeSettings();
  const queue = useSandbox((state) => state.queue);
  const saveSchedule = useSandbox((state) => state.saveSchedule);

  return useCallback(
    (commands: DeadlineCommand[], label: string) => {
      if (commands.length === 0) {
        return;
      }

      if (apply === 'batch') {
        queue(commands);
      } else {
        void saveSchedule(commands, label);
      }
    },
    [apply, queue, saveSchedule]
  );
}
