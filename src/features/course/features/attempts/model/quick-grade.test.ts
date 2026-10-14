import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import { formatGrade, GradeSchema } from '@/features/course/model/grade';
import {
  createQuickGradeUpdate,
  getQuickGradeDraftError,
  type QuickGradeAttempt,
} from './quick-grade';

const grade = (value: number) => v.parse(GradeSchema, value);

const ungraded: QuickGradeAttempt = {
  task: { maxGrade: grade(10) },
  grade: null,
  reviewLock: null,
};
const graded: QuickGradeAttempt = {
  ...ungraded,
  grade: {
    value: grade(7.5),
    gradedAt: '2026-05-20T12:00:00Z',
    gradedBy: 'Анна',
  },
};

describe('getQuickGradeDraftError', () => {
  test('an untouched ungraded Attempt is not an error', () => {
    expect(getQuickGradeDraftError(ungraded, undefined)).toBeNull();
    expect(getQuickGradeDraftError(ungraded, '')).toBeNull();
  });

  test('an existing Grade cannot be erased', () => {
    expect(getQuickGradeDraftError(graded, '')).toBe('empty');
  });

  test.each([
    ['abc', 'not-a-number'],
    ['7,1255', 'too-precise'],
    ['10,5', 'above-max'],
  ])('reports %j as %s', (draft, error) => {
    expect(getQuickGradeDraftError(ungraded, draft)).toBe(error);
  });
});

describe('createQuickGradeUpdate', () => {
  test('carries the parsed Grade', () => {
    const update = createQuickGradeUpdate({
      attemptId: 'a1',
      attempt: ungraded,
      draft: '8.125',
    });
    expect(update && formatGrade(update.grade)).toBe('8,125');
  });

  test.each([
    ['an unchanged draft', graded, '7,5'],
    ['an invalid draft', graded, '7,1255'],
    ['an erased Grade', graded, ''],
    [
      'a locked Attempt',
      { ...ungraded, reviewLock: { teacherName: 'Анна', lockedAt: '' } },
      '8',
    ],
  ])('skips %s', (_name, attempt, draft) => {
    expect(
      createQuickGradeUpdate({ attemptId: 'a1', attempt, draft })
    ).toBeNull();
  });
});
