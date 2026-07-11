import { createStore, type StoreApi } from 'zustand/vanilla';

import type { CoursePageResources } from '@/features/course/features/page/model/types';
import {
  createCoursePageBlockSelectionItem,
  type CoursePageBlockSelection,
  type CoursePageBlockSelectionTarget,
} from '@/features/course/features/page-edit/model/block-selection';
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
  blockSelection: CoursePageBlockSelection;
  contentEditorContainer: HTMLElement | null;
  hoveredInsertPanelTargetKey: string | null;
  insertPanelState: CoursePageBlockInsertPanelState;
  isInsertPanelHovered: boolean;
  onResourcesChange: ((resources: CoursePageResources) => void) | null;
  resources: CoursePageResources;
};

export type CoursePageEditStoreActions = {
  changeResources: (resources: CoursePageResources) => void;
  clearBlockSelection: () => void;
  hideInsertPanel: () => void;
  hideInsertPanelPreview: () => void;
  replaceBlockSelection: (targets: CoursePageBlockSelectionTarget[]) => void;
  selectOnlyBlock: (target: CoursePageBlockSelectionTarget) => void;
  setContentEditorContainer: (container: HTMLElement | null) => void;
  setEditorResources: (
    resources: CoursePageResources,
    onResourcesChange: ((resources: CoursePageResources) => void) | null
  ) => void;
  setInsertPanelHovered: (isHovered: boolean) => void;
  showInsertPanelPreview: (cursorY: number) => void;
};

export type CoursePageEditStore = CoursePageEditStoreState &
  CoursePageEditStoreActions;

export type CoursePageEditStoreApi = StoreApi<CoursePageEditStore>;

export type CoursePageEditStoreOptions = {
  resources?: CoursePageResources;
};

function getEmptyResources(): CoursePageResources {
  return { assignments: [], files: [], images: [] };
}

function getHiddenInsertPanelState(): CoursePageBlockInsertPanelState {
  return { status: 'hidden' };
}

export function createCoursePageEditStore({
  resources = getEmptyResources(),
}: CoursePageEditStoreOptions = {}): CoursePageEditStoreApi {
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
      onResourcesChange: null,
      resources,
      changeResources: (nextResources) => {
        set({ resources: nextResources });
        get().onResourcesChange?.(nextResources);
      },
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
      setContentEditorContainer: (container) =>
        set((state) =>
          state.contentEditorContainer === container
            ? state
            : { contentEditorContainer: container }
        ),
      setEditorResources: (nextResources, onResourcesChange) =>
        set((state) =>
          state.resources === nextResources &&
          state.onResourcesChange === onResourcesChange
            ? state
            : { onResourcesChange, resources: nextResources }
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
