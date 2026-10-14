import { createContext, useContext, useSyncExternalStore } from 'react';

import type {
  DiffReadiness,
  DiffReadinessStore,
} from '@/features/course/features/attempt-review/model/diff-readiness';

export const DiffReadinessContext = createContext<DiffReadinessStore | null>(
  null
);

export function useDiffReadiness(): {
  readiness: DiffReadiness;
  retry: () => void;
} {
  const store = useContext(DiffReadinessContext);

  if (!store) {
    throw new Error('useDiffReadiness must be used inside DiffWorkers');
  }

  const readiness = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return { readiness, retry: store.retry };
}
