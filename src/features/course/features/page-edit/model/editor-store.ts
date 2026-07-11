import { createStore, type StoreApi } from 'zustand/vanilla';

export type CoursePageEditStoreState = {
  contentEditorContainer: HTMLElement | null;
};

export type CoursePageEditStoreActions = {
  setContentEditorContainer: (container: HTMLElement | null) => void;
};

export type CoursePageEditStore = CoursePageEditStoreState &
  CoursePageEditStoreActions;

export type CoursePageEditStoreApi = StoreApi<CoursePageEditStore>;

export function createCoursePageEditStore(): CoursePageEditStoreApi {
  return createStore<CoursePageEditStore>()((set) => ({
    contentEditorContainer: null,
    setContentEditorContainer: (container) =>
      set({ contentEditorContainer: container }),
  }));
}
