import { createStore, type StoreApi } from 'zustand/vanilla';

import type {
  CourseContentBlockItem,
  CoursePage,
  CoursePageResources,
} from '@/features/course/features/page/model/types';
import {
  createCoursePageBlockSelectionItem,
  type CoursePageBlockSelection,
  type CoursePageBlockSelectionTarget,
} from '@/features/course/features/page-edit/model/block-selection';
import { compareCoursePages } from '@/features/course/features/page-edit/model/dirty-compare';
import {
  areCoursePageBlockInsertPanelStatesEqual,
  getCoursePageBlockInsertPanelTargetKey,
  getNextCoursePageBlockInsertPanelState,
  type CoursePageBlockInsertPanelState,
} from '@/features/course/features/page-edit/model/insert-panel-targeting';
import {
  hasCoursePageEditErrors,
  validateCoursePageEdit,
  type CoursePageEditValidationErrors,
} from '@/features/course/features/page-edit/model/validation';

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

function getHiddenInsertPanelState(): CoursePageBlockInsertPanelState {
  return { status: 'hidden' };
}

function getCoursePageEditDerivedState(
  initialCourse: CoursePage,
  workingCopy: CoursePage
) {
  const errors = validateCoursePageEdit({
    title: workingCopy.title,
    courseId: workingCopy.courseId,
    description: workingCopy.description,
  });
  const isDirty = compareCoursePages(initialCourse, workingCopy);

  return {
    errors,
    isDirty,
    canApply: isDirty && !hasCoursePageEditErrors(errors),
  };
}

function getCoursePageEditWorkingCopyState(
  initialCourse: CoursePage,
  workingCopy: CoursePage
) {
  return {
    initialCourse,
    workingCopy,
    ...getCoursePageEditDerivedState(initialCourse, workingCopy),
  };
}

function resolveWorkingCopyUpdate(
  current: CoursePage,
  update: CoursePageWorkingCopyUpdate
) {
  return typeof update === 'function' ? update(current) : update;
}

export function createCoursePageEditStore({
  course,
}: CoursePageEditStoreOptions): CoursePageEditStoreApi {
  const initialWorkingCopy = structuredClone(course);
  let pendingPreviewCursorY: number | null = null;
  let previewAnimationFrame: number | null = null;

  return createStore<CoursePageEditStore>()((set, get) => {
    function cancelPendingPreview() {
      if (previewAnimationFrame !== null) {
        cancelAnimationFrame(previewAnimationFrame);
      }

      pendingPreviewCursorY = null;
      previewAnimationFrame = null;
    }

    function setInsertPanelState(
      insertPanelState: CoursePageBlockInsertPanelState
    ) {
      set((state) => {
        const hoveredInsertPanelTargetKey =
          getCoursePageBlockInsertPanelTargetKey(
            insertPanelState,
            state.isInsertPanelHovered
          );

        if (
          state.hoveredInsertPanelTargetKey === hoveredInsertPanelTargetKey &&
          areCoursePageBlockInsertPanelStatesEqual(
            state.insertPanelState,
            insertPanelState
          )
        ) {
          return state;
        }

        return {
          hoveredInsertPanelTargetKey,
          insertPanelState,
        };
      });
    }

    function commitPendingPreview() {
      const cursorY = pendingPreviewCursorY;

      pendingPreviewCursorY = null;
      previewAnimationFrame = null;

      if (cursorY === null) {
        return;
      }

      const container = get().contentEditorContainer;
      const insertPanelState = container
        ? getNextCoursePageBlockInsertPanelState(container, cursorY)
        : getHiddenInsertPanelState();

      setInsertPanelState(insertPanelState);
    }

    function schedulePreviewCommit() {
      if (previewAnimationFrame !== null) {
        return;
      }

      previewAnimationFrame = requestAnimationFrame(commitPendingPreview);
    }

    return {
      blockSelection: { status: 'none' },
      contentEditorContainer: null,
      hoveredInsertPanelTargetKey: null,
      insertPanelState: getHiddenInsertPanelState(),
      isInsertPanelHovered: false,
      ...getCoursePageEditWorkingCopyState(course, initialWorkingCopy),
      changeResources: (resources) =>
        get().setWorkingCopy((current) => ({ ...current, resources })),
      clearBlockSelection: () =>
        set((state) =>
          state.blockSelection.status === 'none'
            ? state
            : { blockSelection: { status: 'none' } }
        ),
      hideInsertPanel: () => {
        cancelPendingPreview();
        setInsertPanelState(getHiddenInsertPanelState());
      },
      hideInsertPanelPreview: () => {
        if (!get().isInsertPanelHovered) {
          get().hideInsertPanel();
        }
      },
      replaceBlockSelection: (targets) => {
        const items = targets.map(createCoursePageBlockSelectionItem);

        if (items.length === 0) {
          get().clearBlockSelection();
          return;
        }

        set({
          blockSelection: {
            status: 'selected',
            anchorKey: items.at(-1)?.key ?? items[0].key,
            items,
          },
        });
      },
      resetWorkingCopy: () =>
        set((state) =>
          getCoursePageEditWorkingCopyState(
            state.initialCourse,
            structuredClone(state.initialCourse)
          )
        ),
      selectOnlyBlock: (target) => {
        const item = createCoursePageBlockSelectionItem(target);

        set({
          blockSelection: {
            status: 'selected',
            anchorKey: item.key,
            items: [item],
          },
        });
      },
      setContent: (content) =>
        get().setWorkingCopy((current) => ({ ...current, content })),
      setContentEditorContainer: (container) =>
        set((state) =>
          state.contentEditorContainer === container
            ? state
            : { contentEditorContainer: container }
        ),
      setInsertPanelHovered: (isHovered) =>
        set((state) => {
          const hoveredInsertPanelTargetKey =
            getCoursePageBlockInsertPanelTargetKey(
              state.insertPanelState,
              isHovered
            );

          if (
            state.hoveredInsertPanelTargetKey === hoveredInsertPanelTargetKey &&
            state.isInsertPanelHovered === isHovered
          ) {
            return state;
          }

          return {
            hoveredInsertPanelTargetKey,
            isInsertPanelHovered: isHovered,
          };
        }),
      setWorkingCopy: (update) =>
        set((state) => {
          const workingCopy = resolveWorkingCopyUpdate(
            state.workingCopy,
            update
          );

          return getCoursePageEditWorkingCopyState(
            state.initialCourse,
            workingCopy
          );
        }),
      showInsertPanelPreview: (cursorY) => {
        pendingPreviewCursorY = cursorY;
        schedulePreviewCommit();
      },
      syncCourse: (nextCourse) =>
        set(
          getCoursePageEditWorkingCopyState(
            nextCourse,
            structuredClone(nextCourse)
          )
        ),
    };
  });
}
