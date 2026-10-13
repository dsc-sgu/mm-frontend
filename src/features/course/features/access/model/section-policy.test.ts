import { describe, expect, test } from 'vitest';
import { canAccessCourseSection, type CourseSection } from './section-policy';

describe('ACC-01: Course section access is course-role specific', () => {
  test.each<[CourseSection, boolean, boolean]>([
    ['page', true, true],
    ['journal', true, true],
    ['attempts', false, true],
    ['repositories', false, true],
    ['files', false, true],
    ['analytics', false, true],
    ['edit', false, true],
  ])('%s: Student=%s, Teacher=%s', (section, student, teacher) => {
    expect(canAccessCourseSection(section, 'student')).toBe(student);
    expect(canAccessCourseSection(section, 'teacher')).toBe(teacher);
  });
});
