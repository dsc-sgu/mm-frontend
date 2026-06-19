import { useEffect, useMemo, useState } from 'react';

import type { CoursePage } from '@/features/course/features/page/model/types';
import { compareCoursePages } from '@/features/course/features/page-edit/model/dirty-compare';
import {
  hasCoursePageEditErrors,
  validateCoursePageEdit,
} from '@/features/course/features/page-edit/model/validation';

export function useCoursePageWorkingCopy(course: CoursePage) {
  const [workingCopy, setWorkingCopy] = useState(() => structuredClone(course));

  useEffect(() => {
    setWorkingCopy(structuredClone(course));
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
    () => compareCoursePages(course, workingCopy),
    [course, workingCopy]
  );

  return {
    workingCopy,
    setWorkingCopy,
    errors,
    isDirty,
    canApply: isDirty && !hasCoursePageEditErrors(errors),
    reset: () => setWorkingCopy(structuredClone(course)),
  };
}
