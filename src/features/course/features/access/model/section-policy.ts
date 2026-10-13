import type { CourseRole } from './types';

export const courseSectionAccess = {
  page: 'member',
  journal: 'member',
  attempts: 'teacher',
  repositories: 'teacher',
  files: 'teacher',
  analytics: 'teacher',
  edit: 'teacher',
} as const;

export type CourseSection = keyof typeof courseSectionAccess;

export function canAccessCourseSection(
  section: CourseSection,
  role: CourseRole
): boolean {
  return courseSectionAccess[section] === 'member' || role === 'teacher';
}
