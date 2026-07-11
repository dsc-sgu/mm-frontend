import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from 'react';
import { useStore } from 'zustand';

import type {
  CoursePageEditStore,
  CoursePageEditStoreApi,
} from '@/features/course/features/page-edit/model/editor-store';

const CoursePageEditStoreContext = createContext<CoursePageEditStoreApi | null>(
  null
);

export function CoursePageEditStoreProvider({
  children,
  store,
}: {
  children: ReactNode;
  store: CoursePageEditStoreApi;
}) {
  return createElement(
    CoursePageEditStoreContext.Provider,
    { value: store },
    children
  );
}

export function useCoursePageEditStoreApi() {
  const store = useContext(CoursePageEditStoreContext);

  if (!store) {
    throw new Error('Course page edit store is not provided');
  }

  return store;
}

export function useCoursePageEditStore<T>(
  selector: (store: CoursePageEditStore) => T
) {
  return useStore(useCoursePageEditStoreApi(), selector);
}
