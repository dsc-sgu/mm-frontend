import type { StateCreator, StoreApi } from 'zustand/vanilla';

import type {
  CourseContentBlockItem,
  CoursePage,
  CoursePageResources,
} from '@/features/course/features/page/model/types';
import type {
  CoursePageBlockSelection,
  CoursePageBlockSelectionTarget,
} from '@/features/course/features/page-edit/model/block-selection';
import type { CoursePageBlockInsertPanelState } from '@/features/course/features/page-edit/model/insert-panel-targeting';
import type { CoursePageEditValidationErrors } from '@/features/course/features/page-edit/model/validation';

export type {
  CoursePageBlockInsertPanelState,
  CoursePageBlockInsertPanelVisibleState,
  CoursePageBlockInsertPlacement,
} from '@/features/course/features/page-edit/model/insert-panel-targeting';

export type CoursePageWorkingCopyUpdate =
  | CoursePage
  | ((current: CoursePage) => CoursePage);

export type CoursePageEditStoreState = {
  blockSelection: CoursePageBlockSelection;
  canApply: boolean;
  contentEditorContainer: HTMLElement | null;
  contentEditorRevision: number;
  errors: CoursePageEditValidationErrors;
  hoveredInsertPanelTargetKey: string | null;
  initialCourse: CoursePage;
  insertPanelState: CoursePageBlockInsertPanelState;
  isDirty: boolean;
  isInsertPanelHovered: boolean;
  workingCopy: CoursePage;
};

export type CoursePageEditStoreActions = {
  changeResources: (resources: CoursePageResources) => void;
  clearBlockSelection: () => void;
  hideInsertPanel: () => void;
  hideInsertPanelPreview: () => void;
  replaceBlockSelection: (targets: CoursePageBlockSelectionTarget[]) => void;
  resetWorkingCopy: () => void;
  selectOnlyBlock: (target: CoursePageBlockSelectionTarget) => void;
  setContent: (content: CourseContentBlockItem[]) => void;
  setContentEditorContainer: (container: HTMLElement | null) => void;
  setInsertPanelHovered: (isHovered: boolean) => void;
  setWorkingCopy: (update: CoursePageWorkingCopyUpdate) => void;
  showInsertPanelPreview: (cursorY: number) => void;
  syncCourse: (course: CoursePage) => void;
};

export type CoursePageEditStore = CoursePageEditStoreState &
  CoursePageEditStoreActions;

export type CoursePageEditStoreApi = StoreApi<CoursePageEditStore>;

export type CoursePageEditStoreOptions = {
  course: CoursePage;
};

export type CoursePageEditStoreCreator = StateCreator<CoursePageEditStore>;
export type CoursePageEditStoreSet = Parameters<CoursePageEditStoreCreator>[0];
export type CoursePageEditStoreGet = Parameters<CoursePageEditStoreCreator>[1];
