import type {
  DiffWorkerPool,
  DiffWorkerPoolFactory,
  DiffWorkerPoolStatus,
} from '@/features/course/features/attempt-review/model/diff-readiness';

type FakePool = {
  status: DiffWorkerPoolStatus;
  terminated: boolean;
  listeners: Set<(status: DiffWorkerPoolStatus) => void>;
};

export type FakeDiffWorkers = {
  createPool: DiffWorkerPoolFactory;
  /** The status every pool created from now on starts with. */
  startWith: (status: DiffWorkerPoolStatus) => void;
  /** Reports a status from every pool that is still running. */
  report: (status: DiffWorkerPoolStatus) => void;
  /** Pools created so far, including terminated ones. */
  created: () => number;
  /** Pools created and not yet terminated. */
  running: () => number;
};

/**
 * jsdom cannot run the diff Web Workers. A fake pool has no manager, so a ready
 * diff renders with the main-thread highlighter, which only tests use.
 */
export function createFakeDiffWorkers(
  initialStatus: DiffWorkerPoolStatus = 'ready'
): FakeDiffWorkers {
  let startStatus = initialStatus;
  const pools: FakePool[] = [];

  function createPool(): DiffWorkerPool {
    const pool: FakePool = {
      status: startStatus,
      terminated: false,
      listeners: new Set(),
    };
    pools.push(pool);

    return {
      manager: undefined,
      subscribe(listener) {
        pool.listeners.add(listener);
        listener(pool.status);
        return () => pool.listeners.delete(listener);
      },
      terminate() {
        pool.terminated = true;
        pool.listeners.clear();
      },
    };
  }

  return {
    createPool,
    startWith(status) {
      startStatus = status;
    },
    report(status) {
      for (const pool of pools) {
        if (pool.terminated) continue;
        pool.status = status;
        for (const listener of pool.listeners) listener(status);
      }
    },
    created: () => pools.length,
    running: () => pools.filter((pool) => !pool.terminated).length,
  };
}
