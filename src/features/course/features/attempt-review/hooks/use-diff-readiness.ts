import { createContext, useContext } from 'react';
import { useStore } from 'zustand';

import type {
  DiffReadiness,
  DiffReadinessStoreApi,
} from '@/features/course/features/attempt-review/model/diff-readiness';

export const DiffReadinessContext = createContext<DiffReadinessStoreApi | null>(
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

  const readiness = useStore(store, (state) => state.readiness);
  const retry = useStore(store, (state) => state.retry);

  return { readiness, retry };
}
