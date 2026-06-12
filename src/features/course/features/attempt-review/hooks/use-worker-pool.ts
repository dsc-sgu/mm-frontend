import { useWorkerPool } from '@pierre/diffs/react';
import { useEffect, useRef, useState } from 'react';

export function useAttemptReviewWorkerPoolReady(): boolean {
  const workerPool = useWorkerPool();
  const [isReady, setIsReady] = useState(
    () => workerPool?.isInitialized() ?? true
  );
  const isReadyRef = useRef(isReady);

  useEffect(() => {
    return workerPool?.subscribeToStatChanges((stats) => {
      const isInitialized = stats.managerState === 'initialized';

      if (isInitialized !== isReadyRef.current) {
        setIsReady(isInitialized);
        isReadyRef.current = isInitialized;
      }
    });
  }, [workerPool]);

  return isReady;
}
