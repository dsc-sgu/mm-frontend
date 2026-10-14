import { describe, expect, test } from 'vitest';
import {
  createDiffReadiness,
  type DiffWorkerPool,
  type DiffWorkerPoolStatus,
} from './diff-readiness';

type FakePool = DiffWorkerPool & {
  report: (status: DiffWorkerPoolStatus) => void;
  terminated: boolean;
};

function fakePools() {
  const created: FakePool[] = [];

  function createPool(): DiffWorkerPool {
    const listeners = new Set<(status: DiffWorkerPoolStatus) => void>();
    const pool: FakePool = {
      manager: undefined,
      terminated: false,
      subscribe(listener) {
        listeners.add(listener);
        listener('loading');
        return () => listeners.delete(listener);
      },
      terminate() {
        pool.terminated = true;
      },
      report(status) {
        for (const listener of listeners) listener(status);
      },
    };
    created.push(pool);
    return pool;
  }

  return { created, createPool };
}

describe('diff readiness', () => {
  test('creates no Workers until it starts', () => {
    const pools = fakePools();
    const readiness = createDiffReadiness(pools.createPool);

    expect(readiness.getSnapshot()).toEqual({ status: 'loading' });
    expect(pools.created).toHaveLength(0);
  });

  test('loading becomes ready with the pool that reported it', () => {
    const pools = fakePools();
    const readiness = createDiffReadiness(pools.createPool);
    readiness.start();

    pools.created[0].report('ready');

    expect(readiness.getSnapshot()).toEqual({
      status: 'ready',
      pool: pools.created[0],
    });
  });

  test('an unavailable Worker or WASM is failed, not endless loading', () => {
    const pools = fakePools();
    const readiness = createDiffReadiness(pools.createPool);
    readiness.start();

    pools.created[0].report('failed');

    expect(readiness.getSnapshot()).toEqual({ status: 'failed' });
  });

  test('retry after a failure recreates the Workers', () => {
    const pools = fakePools();
    const readiness = createDiffReadiness(pools.createPool);
    readiness.start();
    pools.created[0].report('failed');

    readiness.retry();

    expect(pools.created).toHaveLength(2);
    expect(pools.created[0].terminated).toBe(true);
    expect(readiness.getSnapshot()).toEqual({ status: 'loading' });
    pools.created[1].report('ready');
    expect(readiness.getSnapshot()).toMatchObject({ status: 'ready' });
  });

  test('retry is a no-op unless the diff failed', () => {
    const pools = fakePools();
    const readiness = createDiffReadiness(pools.createPool);
    readiness.start();

    readiness.retry();
    pools.created[0].report('ready');
    readiness.retry();

    expect(pools.created).toHaveLength(1);
    expect(readiness.getSnapshot()).toMatchObject({ status: 'ready' });
  });

  test('a stopped pool is terminated and its late reports are ignored', () => {
    const pools = fakePools();
    const readiness = createDiffReadiness(pools.createPool);
    readiness.start();

    readiness.stop();
    pools.created[0].report('ready');

    expect(pools.created[0].terminated).toBe(true);
    expect(readiness.getSnapshot()).toEqual({ status: 'loading' });
  });

  test('notifies subscribers only when readiness changes', () => {
    const pools = fakePools();
    const readiness = createDiffReadiness(pools.createPool);
    let notifications = 0;
    readiness.subscribe(() => notifications++);
    readiness.start();

    pools.created[0].report('loading');
    pools.created[0].report('ready');
    pools.created[0].report('ready');

    expect(notifications).toBe(1);
  });
});
