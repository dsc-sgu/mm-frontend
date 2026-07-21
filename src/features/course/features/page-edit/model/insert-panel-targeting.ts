import type { Path } from 'platejs';

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

export function getNextCoursePageBlockInsertPanelState(
  container: HTMLElement,
  cursorY: number
): CoursePageBlockInsertPanelState {
  const containerRect = container.getBoundingClientRect();

  if (cursorY < containerRect.top || cursorY > containerRect.bottom) {
    return { status: 'hidden' };
  }

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

export function getCoursePageBlockInsertPanelTargetKey(
  state: CoursePageBlockInsertPanelState,
  isInsertPanelHovered: boolean
) {
  return isInsertPanelHovered && state.status === 'visible'
    ? getCoursePageBlockTargetKey(state.target)
    : null;
}

export function areCoursePageBlockInsertPanelStatesEqual(
  first: CoursePageBlockInsertPanelState,
  second: CoursePageBlockInsertPanelState
) {
  if (first.status === 'hidden' || second.status === 'hidden') {
    return first.status === second.status;
  }

  return (
    first.cursorY === second.cursorY &&
    first.lineY === second.lineY &&
    first.placement === second.placement &&
    getCoursePageBlockTargetKey(first.target) ===
      getCoursePageBlockTargetKey(second.target)
  );
}
