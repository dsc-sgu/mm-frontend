import type { ReactNode } from 'react';

import type { CoursePageResources } from '@/features/course/features/page/model/types';
import { CoursePageEditorResourceContext } from '@/features/course/features/page-edit/model/resource-context';

export function CoursePageEditorResourceProvider({
  children,
  resources,
}: {
  children: ReactNode;
  resources: CoursePageResources;
}) {
  return (
    <CoursePageEditorResourceContext.Provider value={resources}>
      {children}
    </CoursePageEditorResourceContext.Provider>
  );
}
