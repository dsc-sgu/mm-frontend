import { type ReactNode, useMemo } from 'react';

import type { CoursePageResources } from '@/features/course/features/page/model/types';
import { CoursePageEditorResourceContext } from '@/features/course/features/page-edit/model/resource-context';

export function CoursePageEditorResourceProvider({
  children,
  onResourcesChange,
  resources,
}: {
  children: ReactNode;
  onResourcesChange?: (resources: CoursePageResources) => void;
  resources: CoursePageResources;
}) {
  const value = useMemo(
    () => ({ resources, onResourcesChange }),
    [onResourcesChange, resources]
  );

  return (
    <CoursePageEditorResourceContext.Provider value={value}>
      {children}
    </CoursePageEditorResourceContext.Provider>
  );
}
