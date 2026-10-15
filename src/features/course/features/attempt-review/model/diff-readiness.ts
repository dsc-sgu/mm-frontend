import type { WorkerPoolManager } from '@pierre/diffs/worker';
import { createStore, type StoreApi } from 'zustand/vanilla';

export type DiffWorkerPoolStatus = 'loading' | 'ready' | 'failed';

/** Diff Workers that highlight the Attempt diff off the main thread. */
export type DiffWorkerPool = {
  /** Only test fakes have none; CodeView then highlights on the main thread. */
  manager: WorkerPoolManager | undefined;
  /** Reports the current status at once, then every change. */
  subscribe: (listener: (status: DiffWorkerPoolStatus) => void) => () => void;
  terminate: () => void;
};

export type DiffWorkerPoolFactory = () => DiffWorkerPool;

export type DiffReadiness =
  | { status: 'loading' }
  | { status: 'ready'; pool: DiffWorkerPool }
  | { status: 'failed' };

export type DiffReadinessStore = {
  readiness: DiffReadiness;
  /** Creates the Workers; a started store keeps its pool. */
  start: () => void;
  /** Terminates the Workers and forgets their status. */
  stop: () => void;
  /** Recreates the Workers after a failure; otherwise a no-op. */
  retry: () => void;
};

export type DiffReadinessStoreApi = StoreApi<DiffReadinessStore>;

const LOADING: DiffReadiness = { status: 'loading' };
const FAILED: DiffReadiness = { status: 'failed' };

function toReadiness(
  status: DiffWorkerPoolStatus,
  pool: DiffWorkerPool
): DiffReadiness {
  switch (status) {
    case 'loading':
      return LOADING;
    case 'ready':
      return { status: 'ready', pool };
    case 'failed':
      return FAILED;
  }
}

export function createDiffReadinessStore(
  createPool: DiffWorkerPoolFactory
): DiffReadinessStoreApi {
  // The running pool is a resource, not state the UI renders.
  let running: { pool: DiffWorkerPool; unsubscribe: () => void } | null = null;

  return createStore<DiffReadinessStore>()((set, get) => {
    function update(next: DiffReadiness) {
      if (next.status === get().readiness.status) return;
      set({ readiness: next });
    }

    function start() {
      if (running) return;
      const pool = createPool();
      running = { pool, unsubscribe: () => {} };
      const current = running;
      current.unsubscribe = pool.subscribe((status) => {
        if (running === current) update(toReadiness(status, pool));
      });
    }

    function stop() {
      if (!running) return;
      const { pool, unsubscribe } = running;
      running = null;
      unsubscribe();
      pool.terminate();
      update(LOADING);
    }

    return {
      readiness: LOADING,
      start,
      stop,
      retry() {
        if (get().readiness.status !== 'failed') return;
        stop();
        start();
      },
    };
  });
}
