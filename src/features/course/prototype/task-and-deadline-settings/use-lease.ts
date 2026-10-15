// PROTOTYPE (#181): the Course Editing Lease as a Teacher actually meets it.
// In A every Task edit goes through the Course Draft Snapshot, so a Teacher
// who edits the same Task (scenario 5) holds the lease: two edits of one
// Task at once cannot happen. In D the Task is published apart with a
// version check and needs no lease.
import { usePrototypeSettings } from './search';
import { useSandbox, type Lease } from './store';
import { NOW } from './time';

export type EffectiveLease = {
  lease: Lease;
  /** The other Teacher holds the lease because he edits this very Task. */
  sameTask: boolean;
};

export function useEffectiveLease(): EffectiveLease {
  const { taskApply } = usePrototypeSettings();
  const lease = useSandbox((state) => state.lease);
  const concurrentEdit = useSandbox((state) => state.concurrentEdit);

  // While I hold the lease, nobody else can start editing in A.
  if (taskApply === 'course' && concurrentEdit && lease.holder !== 'me') {
    return {
      lease:
        lease.holder === 'other'
          ? lease
          : { holder: 'other', since: NOW - 5 * 60 * 1000 },
      sameTask: true,
    };
  }

  return { lease, sameTask: false };
}
