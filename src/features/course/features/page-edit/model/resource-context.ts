import { createContext, useContext } from 'react';

import type { CoursePageResources } from '@/features/course/features/page/model/types';

export const CoursePageEditorResourceContext =
  createContext<CoursePageResources | null>(null);

export function useCoursePageEditorResources() {
  const resources = useContext(CoursePageEditorResourceContext);

  if (!resources) {
    throw new Error('Course page editor resources are not provided');
  }

  return resources;
}
