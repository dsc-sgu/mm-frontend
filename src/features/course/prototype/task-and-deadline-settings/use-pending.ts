// PROTOTYPE (#181): what the pending batch changes, for markers and preview.
import { useMemo } from 'react';

import { diffSchedules, latenessChanges } from './schedule';
import { ATTEMPTS, STUDENTS, useSandbox, useViewSchedule } from './store';

export function usePendingChanges() {
  const schedule = useSandbox((state) => state.schedule);
  const view = useViewSchedule();

  return useMemo(() => {
    const changes = view === schedule ? [] : diffSchedules(schedule, view);
    const lateness =
      changes.length === 0
        ? { becameLate: [], becameOnTime: [] }
        : latenessChanges(schedule, view, ATTEMPTS, STUDENTS);

    return {
      changes,
      keys: new Set(changes.map((change) => change.key)),
      lateness,
    };
  }, [schedule, view]);
}
