import { createContext, useContext } from 'react';

import type { CoursePageResources } from '@/features/course/features/page/model/types';

type CoursePageEditorResourceContextValue = {
  resources: CoursePageResources;
  onResourcesChange?: (resources: CoursePageResources) => void;
};

export const CoursePageEditorResourceContext =
  createContext<CoursePageEditorResourceContextValue | null>(null);

export function useCoursePageEditorResourceContext() {
  const context = useContext(CoursePageEditorResourceContext);

  if (!context) {
    throw new Error('Course page editor resources are not provided');
  }

  return context;
}

export function useCoursePageEditorResources() {
  return useCoursePageEditorResourceContext().resources;
}
