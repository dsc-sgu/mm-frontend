import type { CourseSection } from '@/features/course/features/access/model/section-policy';

export function getCourseSection(
  matches: readonly { staticData: { courseSection?: CourseSection } }[]
): CourseSection {
  // Nested editing/review routes override the member-accessible Course root.
  return matches.reduce<CourseSection>(
    (section, match) => match.staticData.courseSection ?? section,
    'page'
  );
}

declare module '@tanstack/react-router' {
  // Module augmentation intentionally uses interface declaration merging.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface StaticDataRouteOption {
    courseSection?: CourseSection;
  }
}
