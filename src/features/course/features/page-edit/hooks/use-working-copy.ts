import { useEffect, useMemo, useState } from 'react';

import type { CoursePage } from '@/features/course/features/page/model/types';
import {
  hasCoursePageEditErrors,
  validateCoursePageEdit,
} from '@/features/course/features/page-edit/model/validation';

function cloneCoursePage(course: CoursePage): CoursePage {
  return structuredClone(course);
}

function getComparableCoursePage(course: CoursePage) {
  return {
    courseId: course.courseId,
    title: course.title,
    description: course.description,
    color: course.color,
    iconName: course.iconName,
    content: course.content,
    resources: course.resources,
  };
}

export function useCoursePageWorkingCopy(course: CoursePage) {
  const [workingCopy, setWorkingCopy] = useState(() => cloneCoursePage(course));

  useEffect(() => {
    setWorkingCopy(cloneCoursePage(course));
  }, [course]);

  const errors = useMemo(
    () =>
      validateCoursePageEdit({
        title: workingCopy.title,
        courseId: workingCopy.courseId,
        description: workingCopy.description,
      }),
    [workingCopy.courseId, workingCopy.description, workingCopy.title]
  );

  const isDirty = useMemo(
    () =>
      JSON.stringify(getComparableCoursePage(course)) !==
      JSON.stringify(getComparableCoursePage(workingCopy)),
    [course, workingCopy]
  );

  return {
    workingCopy,
    setWorkingCopy,
    errors,
    isDirty,
    canApply: isDirty && !hasCoursePageEditErrors(errors),
    reset: () => setWorkingCopy(cloneCoursePage(course)),
  };
}
