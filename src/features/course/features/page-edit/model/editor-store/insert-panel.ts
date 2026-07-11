import {
  areCoursePageBlockInsertPanelStatesEqual,
  getCoursePageBlockInsertPanelTargetKey,
  getNextCoursePageBlockInsertPanelState,
  type CoursePageBlockInsertPanelState,
} from '@/features/course/features/page-edit/model/insert-panel-targeting';
import type {
  CoursePageEditStoreActions,
  CoursePageEditStoreGet,
  CoursePageEditStoreSet,
  CoursePageEditStoreState,
} from '@/features/course/features/page-edit/model/editor-store/types';

function getHiddenInsertPanelState(): CoursePageBlockInsertPanelState {
  return { status: 'hidden' };
}

export function createInsertPanelSlice(
  set: CoursePageEditStoreSet,
  get: CoursePageEditStoreGet
): Pick<
  CoursePageEditStoreState,
  | 'contentEditorContainer'
  | 'hoveredInsertPanelTargetKey'
  | 'insertPanelState'
  | 'isInsertPanelHovered'
> &
  Pick<
    CoursePageEditStoreActions,
    | 'hideInsertPanel'
    | 'hideInsertPanelPreview'
    | 'setContentEditorContainer'
    | 'setInsertPanelHovered'
    | 'showInsertPanelPreview'
  > {
  let pendingPreviewCursorY: number | null = null;
  let previewAnimationFrame: number | null = null;

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
}
