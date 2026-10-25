import * as v from 'valibot';
import { expect, test } from 'vitest';
import { GradeSchema } from '@/features/course/model/grade';
import { seededCourses } from './courses';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  seededUsers,
  SESSION_EXPIRES_AT,
} from './state';

test('the default development world retains its Users, Courses and submissions', () => {
  mockBackend.reset();
  const state = mockBackend.state;

  expect(state.users).toEqual(Object.values(seededUsers));
  expect(state.courses).toEqual(seededCourses);
  expect(state.session).toEqual({
    userId: seededUsers.mitTeacher.id,
    expiresAt: SESSION_EXPIRES_AT,
  });
  expect(state.nextUserNumber).toBe(4);
  expect(state.tasks).toEqual(
    seededCourses.map(({ id }) => ({
      courseId: id,
      id: '1',
      title: 'Вводное практическое задание',
      maxGrade: v.parse(GradeSchema, 10),
      deadlineAt: '2026-05-26T20:59:59.000Z',
    }))
  );

  const mit = seededCourses.find(
    ({ slug }) => slug === 'modern-information-technologies'
  );
  if (!mit) throw new Error('The development fixture has no MIT Course');
  expect(
    state.memberships.filter(({ courseId }) => courseId === mit.id)
  ).toEqual([
    { courseId: mit.id, userId: seededUsers.mitTeacher.id, role: 'teacher' },
    { courseId: mit.id, userId: seededUsers.mitStudent.id, role: 'student' },
    { courseId: mit.id, userId: seededUsers.student.id, role: 'student' },
  ]);
  expect(
    state.memberships.filter(({ courseId }) => courseId !== mit.id)
  ).toEqual(
    seededCourses
      .filter(({ id }) => id !== mit.id)
      .map(({ id }) => ({
        courseId: id,
        userId: seededUsers.mitTeacher.id,
        role: 'student',
      }))
  );
  const students = state.memberships.filter(({ role }) => role === 'student');
  expect(state.attempts).toHaveLength(students.length * 4);
  for (const { courseId, userId } of students) {
    const attempts = state.attempts.filter(
      (attempt) => attempt.courseId === courseId && attempt.studentId === userId
    );
    expect(attempts.map(({ attemptNumber }) => attemptNumber)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(attempts.every(({ taskId }) => taskId === '1')).toBe(true);
  }
  // The demo: the Teacher's Course has Attempts #1–#3 reviewed, the stress
  // Attempt #4 is not; Courses the Teacher studies in have no Reviews.
  const reviewed = new Set(state.reviews.map(({ attemptId }) => attemptId));
  expect(
    state.attempts.map(({ id, attemptNumber }) => [
      attemptNumber,
      reviewed.has(id),
    ])
  ).toEqual(
    state.attempts.map(({ courseId, attemptNumber }) => [
      attemptNumber,
      courseId === mit.id && attemptNumber < 4,
    ])
  );
});

test('the access world retains course-local memberships without Tasks or Attempts', () => {
  mockBackend.reset('world:access');
  const {
    users,
    courses,
    memberships,
    tasks,
    attempts,
    reviews,
    unseenAttemptUpdates,
    session,
    nextUserNumber,
  } = mockBackend.state;

  expect(users).toEqual(Object.values(accessWorld.users));
  expect(courses).toEqual(Object.values(accessWorld.courses));
  expect(memberships).toEqual([
    {
      courseId: accessWorld.courses.algorithms.id,
      userId: accessWorld.users.anna.id,
      role: 'teacher',
    },
    {
      courseId: accessWorld.courses.algorithms.id,
      userId: accessWorld.users.boris.id,
      role: 'teacher',
    },
    {
      courseId: accessWorld.courses.algorithms.id,
      userId: accessWorld.users.sasha.id,
      role: 'student',
    },
    {
      courseId: accessWorld.courses.algorithms.id,
      userId: accessWorld.users.petya.id,
      role: 'student',
    },
    {
      courseId: accessWorld.courses.algorithms.id,
      userId: accessWorld.users.vera.id,
      role: 'student',
    },
    {
      courseId: accessWorld.courses.databases.id,
      userId: accessWorld.users.vera.id,
      role: 'teacher',
    },
  ]);
  expect(tasks).toEqual([]);
  expect(attempts).toEqual([]);
  expect(reviews).toEqual([]);
  expect(unseenAttemptUpdates).toEqual([]);
  expect(session).toEqual({
    userId: accessWorld.users.anna.id,
    expiresAt: SESSION_EXPIRES_AT,
  });
  expect(nextUserNumber).toBe(7);
});

test('the review world explicitly extends the access world with its Task, Attempts and Reviews', () => {
  mockBackend.reset('world:access');
  const accessState = mockBackend.state;
  mockBackend.reset('world:review');

  expect(mockBackend.state).toEqual({
    ...accessState,
    tasks: [reviewWorld.task],
    attempts: reviewWorld.attempts,
    reviews: reviewWorld.reviews,
    unseenAttemptUpdates: reviewWorld.unseenAttemptUpdates,
  });
});

test.each(['dev', 'world:access', 'world:review'] as const)(
  'resetting %s restores a deterministic state without mutating exported fixtures',
  (world) => {
    const fixtures = { seededUsers, seededCourses, accessWorld, reviewWorld };
    const originalFixtures = structuredClone(fixtures);
    mockBackend.reset(world);
    const previous = mockBackend.state;
    const originalState = structuredClone(previous);

    previous.users[0].firstName = 'Changed User';
    previous.courses[0].teachers[0].firstName = 'Changed Teacher';
    previous.memberships[0].role = 'student';
    previous.tasks.splice(0);
    previous.attempts.splice(0);
    previous.reviews.splice(0);
    previous.unseenAttemptUpdates.splice(0);
    previous.session = null;
    previous.nextUserNumber = 100;

    mockBackend.reset(world);
    expect(mockBackend.state).not.toBe(previous);
    expect(mockBackend.state).toEqual(originalState);
    expect(fixtures).toEqual(originalFixtures);
  }
);
