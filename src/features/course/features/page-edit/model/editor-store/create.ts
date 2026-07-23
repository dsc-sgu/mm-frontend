import { createStore } from 'zustand/vanilla';

import { createInsertPanelSlice } from '@/features/course/features/page-edit/model/editor-store/insert-panel';
import type {
  CoursePageEditStore,
  CoursePageEditStoreApi,
  CoursePageEditStoreOptions,
} from '@/features/course/features/page-edit/model/editor-store/types';
import {
  createWorkingCopyActions,
  createWorkingCopyInitialState,
} from '@/features/course/features/page-edit/model/editor-store/working-copy';

export function createCoursePageEditStore({
  course,
}: CoursePageEditStoreOptions): CoursePageEditStoreApi {
  return createStore<CoursePageEditStore>()((set, get) => ({
    ...createInsertPanelSlice(set, get),
    ...createWorkingCopyInitialState(course),
    ...createWorkingCopyActions(set, get),
  }));
}
