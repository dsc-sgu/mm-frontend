import { describe, expect, it } from 'vitest';
import { courseAccessRouteState } from './route-state';

describe('ACC-02: course access route categories', () => {
  it.each([
    ['course-not-found', 'course-not-found'],
    ['role-mismatch', 'forbidden'],
    ['resource-not-found', 'resource-not-found'],
    ['operation-failed', 'check-failed'],
  ] as const)(
    'maps %s to %s without leaking resource access',
    (outcome, state) => {
      expect(courseAccessRouteState(outcome)).toBe(state);
    }
  );
});
