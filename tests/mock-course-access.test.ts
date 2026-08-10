import { expect, test } from 'bun:test';

import { MOCK_COURSES } from '@/features/course/api/mock';
import { fetchCourseAccess } from '@/features/course/features/access/api/mock';

const MOCK_USERNAME = 'mit-teacher';
const TEACHER_COURSE_SLUG = 'modern-information-technologies';

test('mock teacher can enter every other mock course as a student', async () => {
  const otherCourseSlugs = MOCK_COURSES.map((course) => course.courseId).filter(
    (courseSlug) => courseSlug !== TEACHER_COURSE_SLUG
  );

  const accessResults = await Promise.all(
    otherCourseSlugs.map((courseSlug) =>
      fetchCourseAccess({ courseSlug, username: MOCK_USERNAME })
    )
  );

  expect(accessResults).toHaveLength(otherCourseSlugs.length);
  for (const access of accessResults) {
    expect(access).toMatchObject({
      status: 'allowed',
      username: MOCK_USERNAME,
      role: 'student',
    });
  }
});
