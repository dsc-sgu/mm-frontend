import { useContext, useEffect, useState, type ReactNode } from 'react';

import { createDiffReadiness } from '@/features/course/features/attempt-review/model/diff-readiness';
import { DiffReadinessContext } from '@/features/course/features/attempt-review/hooks/use-diff-readiness';
import { DiffWorkerPoolFactoryContext } from './diff-worker-pool';

type DiffWorkersProps = {
  children: ReactNode;
};

/** Runs the diff Workers only while an Attempt page or Review editor is open. */
export function DiffWorkers({ children }: DiffWorkersProps) {
  const createPool = useContext(DiffWorkerPoolFactoryContext);
  const [readiness] = useState(() => createDiffReadiness(createPool));

  useEffect(() => {
    readiness.start();
    return readiness.stop;
  }, [readiness]);

  return (
    <DiffReadinessContext value={readiness}>{children}</DiffReadinessContext>
  );
}
