import { expect, test } from 'vitest';
import { accessWorld } from '@/app/mock-backend/state';
import { canReplyToAttempt } from './permissions';

test('only a Course Teacher or the resolved Attempt owner can reply', () => {
  const { sasha, petya, anna, vera } = accessWorld.users;
  expect(canReplyToAttempt('student', sasha.id, sasha.id)).toBe(true);
  expect(canReplyToAttempt('student', sasha.id, petya.id)).toBe(false);
  expect(canReplyToAttempt('teacher', anna.id, petya.id)).toBe(true);
  // Vera's Teacher role in Databases grants nothing in Algorithms.
  expect(canReplyToAttempt('student', vera.id, petya.id)).toBe(false);
});
