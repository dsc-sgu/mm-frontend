import type { Path } from 'platejs';
import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  getCoursePageBlockTargetKey,
  type CoursePageBlockTarget,
} from '@/features/course/features/page-edit/model/block-target';

export type CoursePageBlockInsertPlacement = 'before' | 'after';

export type CoursePageBlockInsertPanelState =
  | { status: 'hidden' }
  | {
      status: 'visible';
      cursorY: number;
      lineY: number;
      target: CoursePageBlockTarget;
      placement: CoursePageBlockInsertPlacement;
    };

export type CoursePageBlockInsertPanelVisibleState = Extract<
  CoursePageBlockInsertPanelState,
  { status: 'visible' }
>;

type BlockCandidate = {
  element: HTMLElement;
  id?: string;
  path: Path;
  rect: DOMRect;
};

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

function parseBlockPath(value: string | undefined): Path | null {
  if (!value) {
    return null;
  }

  const path = value.split('.').map((segment) => Number(segment));

  return path.every(Number.isInteger) ? path : null;
}

function getBlockCandidates(container: HTMLElement): BlockCandidate[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-course-page-block="true"]')
  ).flatMap((element): BlockCandidate[] => {
    const path = parseBlockPath(element.dataset.coursePageBlockPath);

    if (!path) {
      return [];
    }

    return [
      {
        element,
        id: element.dataset.coursePageBlockId,
        path,
        rect: element.getBoundingClientRect(),
      },
    ];
  });
}

function getNearestBlockCandidate(
  candidates: BlockCandidate[],
  cursorY: number
): BlockCandidate | null {
  return candidates.reduce<BlockCandidate | null>((nearest, candidate) => {
    if (!nearest) {
      return candidate;
    }

    const candidateMiddle = candidate.rect.top + candidate.rect.height / 2;
    const nearestMiddle = nearest.rect.top + nearest.rect.height / 2;

    return Math.abs(candidateMiddle - cursorY) <
      Math.abs(nearestMiddle - cursorY)
      ? candidate
      : nearest;
  }, null);
}

function getNextInsertPanelState(
  container: HTMLElement,
  cursorY: number
): CoursePageBlockInsertPanelState {
  const containerRect = container.getBoundingClientRect();
  const nearestBlock = getNearestBlockCandidate(
    getBlockCandidates(container),
    cursorY
  );

  if (!nearestBlock) {
    return { status: 'hidden' };
  }

  const placement: CoursePageBlockInsertPlacement =
    cursorY < nearestBlock.rect.top + nearestBlock.rect.height / 2
      ? 'before'
      : 'after';
  const lineY =
    placement === 'before' ? nearestBlock.rect.top : nearestBlock.rect.bottom;

  return {
    status: 'visible',
    cursorY: cursorY - containerRect.top,
    lineY: lineY - containerRect.top,
    target:
      typeof nearestBlock.id === 'string'
        ? { source: 'id', id: nearestBlock.id, path: nearestBlock.path }
        : { source: 'path', path: nearestBlock.path },
    placement,
  };
}

function getHoveredInsertPanelTargetKey(
  state: CoursePageBlockInsertPanelState,
  isInsertPanelHovered: boolean
) {
  return isInsertPanelHovered && state.status === 'visible'
    ? getCoursePageBlockTargetKey(state.target)
    : null;
}

export function createCoursePageEditStore(): CoursePageEditStoreApi {
  return createStore<CoursePageEditStore>()((set, get) => ({
    contentEditorContainer: null,
    hoveredInsertPanelTargetKey: null,
    insertPanelState: { status: 'hidden' },
    isInsertPanelHovered: false,
    hideInsertPanel: () =>
      set({
        hoveredInsertPanelTargetKey: null,
        insertPanelState: { status: 'hidden' },
      }),
    hideInsertPanelPreview: () => {
      if (!get().isInsertPanelHovered) {
        get().hideInsertPanel();
      }
    },
    setContentEditorContainer: (container) =>
      set({ contentEditorContainer: container }),
    setInsertPanelHovered: (isHovered) =>
      set((state) => ({
        hoveredInsertPanelTargetKey: getHoveredInsertPanelTargetKey(
          state.insertPanelState,
          isHovered
        ),
        isInsertPanelHovered: isHovered,
      })),
    showInsertPanelPreview: (cursorY) => {
      const container = get().contentEditorContainer;
      const insertPanelState = container
        ? getNextInsertPanelState(container, cursorY)
        : { status: 'hidden' as const };

      set((state) => ({
        hoveredInsertPanelTargetKey: getHoveredInsertPanelTargetKey(
          insertPanelState,
          state.isInsertPanelHovered
        ),
        insertPanelState,
      }));
    },
  }));
}
