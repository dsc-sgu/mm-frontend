import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  areCoursePageBlockInsertPanelStatesEqual,
  getCoursePageBlockInsertPanelTargetKey,
  getNextCoursePageBlockInsertPanelState,
  type CoursePageBlockInsertPanelState,
} from '@/features/course/features/page-edit/model/insert-panel-targeting';

export type {
  CoursePageBlockInsertPanelState,
  CoursePageBlockInsertPanelVisibleState,
  CoursePageBlockInsertPlacement,
} from '@/features/course/features/page-edit/model/insert-panel-targeting';

export type CoursePageEditStoreState = {
  contentEditorContainer: HTMLElement | null;
  hoveredInsertPanelTargetKey: string | null;
  insertPanelState: CoursePageBlockInsertPanelState;
  isInsertPanelHovered: boolean;
};

export type CoursePageEditStoreActions = {
  hideInsertPanel: () => void;
  hideInsertPanelPreview: () => void;
  setContentEditorContainer: (container: HTMLElement | null) => void;
  setInsertPanelHovered: (isHovered: boolean) => void;
  showInsertPanelPreview: (cursorY: number) => void;
};

export type CoursePageEditStore = CoursePageEditStoreState &
  CoursePageEditStoreActions;

export type CoursePageEditStoreApi = StoreApi<CoursePageEditStore>;

function getHiddenInsertPanelState(): CoursePageBlockInsertPanelState {
  return { status: 'hidden' };
}

export function createCoursePageEditStore(): CoursePageEditStoreApi {
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
      contentEditorContainer: null,
      hoveredInsertPanelTargetKey: null,
      insertPanelState: getHiddenInsertPanelState(),
      isInsertPanelHovered: false,
      hideInsertPanel: () => {
        cancelPendingPreview();
        setInsertPanelState(getHiddenInsertPanelState());
      },
      hideInsertPanelPreview: () => {
        if (!get().isInsertPanelHovered) {
          get().hideInsertPanel();
        }
      },
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
      showInsertPanelPreview: (cursorY) => {
        pendingPreviewCursorY = cursorY;
        schedulePreviewCommit();
      },
    };
  });
}
