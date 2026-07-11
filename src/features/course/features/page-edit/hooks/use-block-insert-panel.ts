import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type RefObject,
} from 'react';
import type { Path } from 'platejs';

import type { CoursePageBlockTarget } from '@/features/course/features/page-edit/model/block-target';

type InsertPlacement = 'before' | 'after';

export type CoursePageBlockInsertPanelState =
  | { status: 'hidden' }
  | {
      status: 'visible';
      cursorY: number;
      lineY: number;
      target: CoursePageBlockTarget;
      placement: InsertPlacement;
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

type CoursePageBlockInsertPanelContextValue = {
  hoveredTarget: CoursePageBlockTarget | null;
  isPanelHovered: boolean;
  state: CoursePageBlockInsertPanelState;
  hide: () => void;
  hidePreview: () => void;
  setPanelHovered: (isHovered: boolean) => void;
  showPreview: (cursorY: number) => void;
};

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

function getNextPanelState(
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

  const placement: InsertPlacement =
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

const defaultContextValue: CoursePageBlockInsertPanelContextValue = {
  hoveredTarget: null,
  isPanelHovered: false,
  state: { status: 'hidden' },
  hide: () => {},
  hidePreview: () => {},
  setPanelHovered: () => {},
  showPreview: () => {},
};

const CoursePageBlockInsertPanelContext =
  createContext<CoursePageBlockInsertPanelContextValue>(defaultContextValue);

export const CoursePageBlockInsertPanelProvider =
  CoursePageBlockInsertPanelContext.Provider;

export function useCoursePageBlockInsertPanelValue(
  containerRef: RefObject<HTMLElement | null>
): CoursePageBlockInsertPanelContextValue {
  const [state, setState] = useState<CoursePageBlockInsertPanelState>({
    status: 'hidden',
  });
  const [isPanelHovered, setPanelHovered] = useState(false);

  const showPreview = useCallback(
    (cursorY: number) => {
      const container = containerRef.current;

      if (!container) {
        setState({ status: 'hidden' });
        return;
      }

      setState(getNextPanelState(container, cursorY));
    },
    [containerRef]
  );

  const hide = useCallback(() => {
    setState({ status: 'hidden' });
  }, []);

  const hidePreview = useCallback(() => {
    if (!isPanelHovered) {
      hide();
    }
  }, [hide, isPanelHovered]);

  const hoveredTarget =
    isPanelHovered && state.status === 'visible' ? state.target : null;

  return useMemo(
    () => ({
      hoveredTarget,
      isPanelHovered,
      state,
      hide,
      hidePreview,
      setPanelHovered,
      showPreview,
    }),
    [hoveredTarget, hide, hidePreview, isPanelHovered, state, showPreview]
  );
}

export function useCoursePageBlockInsertPanel() {
  return useContext(CoursePageBlockInsertPanelContext);
}
