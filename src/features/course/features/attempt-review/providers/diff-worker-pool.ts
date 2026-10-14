import { DEFAULT_THEMES } from '@pierre/diffs';
import type {
  WorkerInitializationRenderOptions,
  WorkerPoolOptions,
} from '@pierre/diffs/react';
import { WorkerPoolManager, type WorkerStats } from '@pierre/diffs/worker';
import { createContext } from 'react';

import type {
  DiffWorkerPool,
  DiffWorkerPoolFactory,
  DiffWorkerPoolStatus,
} from '@/features/course/features/attempt-review/model/diff-readiness';

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return (
    navigator.maxTouchPoints > 0 &&
    typeof matchMedia !== 'undefined' &&
    matchMedia('(max-width: 767px), (pointer: coarse)').matches
  );
}

function getWorkerResourceLimits(): Pick<
  Required<WorkerPoolOptions>,
  'poolSize' | 'totalASTLRUCacheSize'
> {
  return isMobileBrowser()
    ? { poolSize: 1, totalASTLRUCacheSize: 10 }
    : { poolSize: 3, totalASTLRUCacheSize: 100 };
}

function getHardwareConcurrency(): number {
  if (typeof navigator === 'undefined') {
    return 1;
  }

  return navigator.hardwareConcurrency ?? 1;
}

function getPoolOptions(): WorkerPoolOptions {
  const limits = getWorkerResourceLimits();

  return {
    poolSize: Math.min(
      Math.max(1, getHardwareConcurrency() - 1),
      limits.poolSize
    ),
    totalASTLRUCacheSize: limits.totalASTLRUCacheSize,
    workerFactory() {
      return new Worker(
        new URL('@pierre/diffs/worker/worker.js', import.meta.url),
        { type: 'module' }
      );
    },
  };
}

const highlighterOptions: WorkerInitializationRenderOptions = {
  theme: DEFAULT_THEMES,
  langs: ['css', 'json', 'markdown', 'tsx', 'typescript'],
  preferredHighlighter: 'shiki-wasm',
};

function getPoolStatus(stats: WorkerStats): DiffWorkerPoolStatus {
  if (stats.workersFailed) return 'failed';
  if (stats.managerState === 'initialized') return 'ready';
  return 'loading';
}

// A Worker script or WASM that fails to load, or Workers that don't answer
// within Pierre's initialization timeout, mark the pool as failed.
function createPierreDiffWorkerPool(): DiffWorkerPool {
  const manager = new WorkerPoolManager(getPoolOptions(), highlighterOptions);

  return {
    manager,
    subscribe(listener) {
      return manager.subscribeToStatChanges((stats) =>
        listener(getPoolStatus(stats))
      );
    },
    terminate() {
      manager.terminate();
    },
  };
}

/** Component tests replace the browser's Workers with a controlled fake. */
export const DiffWorkerPoolFactoryContext =
  createContext<DiffWorkerPoolFactory>(createPierreDiffWorkerPool);
