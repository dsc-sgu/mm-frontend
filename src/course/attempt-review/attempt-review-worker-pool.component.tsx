import { DEFAULT_THEMES } from '@pierre/diffs';
import {
  WorkerPoolContextProvider,
  type WorkerInitializationRenderOptions,
  type WorkerPoolOptions,
} from '@pierre/diffs/react';
import type { ReactNode } from 'react';

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

const workerResourceLimits = getWorkerResourceLimits();

const poolOptions: WorkerPoolOptions = {
  poolSize: Math.min(
    Math.max(1, getHardwareConcurrency() - 1),
    workerResourceLimits.poolSize
  ),
  totalASTLRUCacheSize: workerResourceLimits.totalASTLRUCacheSize,
  workerFactory() {
    return new Worker(
      new URL('@pierre/diffs/worker/worker.js', import.meta.url),
      { type: 'module' }
    );
  },
};

const highlighterOptions: WorkerInitializationRenderOptions = {
  theme: DEFAULT_THEMES,
  langs: ['css', 'json', 'markdown', 'tsx', 'typescript'],
  preferredHighlighter: 'shiki-wasm',
};

type AttemptReviewWorkerPoolProps = {
  children: ReactNode;
};

export function AttemptReviewWorkerPool({
  children,
}: AttemptReviewWorkerPoolProps) {
  return (
    <WorkerPoolContextProvider
      poolOptions={poolOptions}
      highlighterOptions={highlighterOptions}
    >
      {children}
    </WorkerPoolContextProvider>
  );
}
