import { useCallback, useRef, type RefObject } from 'react';
import type { CodeViewHandle } from '@pierre/diffs/react';

import type { AttemptReviewLineCommentAnnotation } from '@/course/attempt-review/model/comment-annotation';

type AttemptReviewFileScrollOptions = {
  diffSectionRef: RefObject<HTMLDivElement | null>;
  diffViewerRef: RefObject<CodeViewHandle<AttemptReviewLineCommentAnnotation> | null>;
  isDesktopReviewLayout: boolean;
  onCloseMobileFileTree: () => void;
};

export function useAttemptReviewFileScroll({
  diffSectionRef,
  diffViewerRef,
  isDesktopReviewLayout,
  onCloseMobileFileTree,
}: AttemptReviewFileScrollOptions) {
  const scrollRequestIdRef = useRef(0);

  const scrollCodeViewToFile = useCallback(
    (path: string, scrollRequestId: number) => {
      stagedScrollCodeViewToItem(
        diffViewerRef.current,
        path,
        () => scrollRequestIdRef.current === scrollRequestId
      );
    },
    [diffViewerRef]
  );

  const scrollToFile = useCallback(
    (path: string) => {
      const scrollRequestId = scrollRequestIdRef.current + 1;
      scrollRequestIdRef.current = scrollRequestId;

      if (!isDesktopReviewLayout) {
        onCloseMobileFileTree();
        waitForAnimationFrames(2, () => {
          if (scrollRequestIdRef.current !== scrollRequestId) {
            return;
          }

          diffSectionRef.current?.scrollIntoView({
            block: 'start',
            behavior: 'smooth',
          });
          scrollCodeViewToFile(path, scrollRequestId);
        });
        return;
      }

      if (isPageAtBottom()) {
        scrollCodeViewToFile(path, scrollRequestId);
        return;
      }

      window.scrollTo({
        top: getPageMaxScrollTop(),
        behavior: 'smooth',
      });

      waitForPageBottom(
        () => {
          scrollCodeViewToFile(path, scrollRequestId);
        },
        () => scrollRequestIdRef.current === scrollRequestId
      );
    },
    [
      diffSectionRef,
      isDesktopReviewLayout,
      onCloseMobileFileTree,
      scrollCodeViewToFile,
    ]
  );

  return { scrollToFile };
}

const PAGE_BOTTOM_EPSILON = 2;
const PAGE_BOTTOM_WAIT_MAX_FRAMES = 90;
const CODE_VIEW_SMOOTH_SCROLL_VIEWPORTS = 3;
const CODE_VIEW_STAGED_SCROLL_THRESHOLD_VIEWPORTS = 6;
const CODE_VIEW_STAGED_SCROLL_FRAME_DELAY = 2;

function stagedScrollCodeViewToItem(
  viewer: CodeViewHandle<AttemptReviewLineCommentAnnotation> | null,
  itemId: string,
  shouldContinue: () => boolean
) {
  if (!viewer || !shouldContinue()) {
    return;
  }

  const instance = viewer.getInstance();

  if (!instance) {
    smoothScrollCodeViewToItem(viewer, itemId);
    return;
  }

  const targetTop = instance.getTopForItem(itemId);
  const currentTop = instance.getScrollTop();
  const viewportHeight = instance.getHeight();

  if (
    targetTop == null ||
    !Number.isFinite(targetTop) ||
    !Number.isFinite(currentTop) ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0
  ) {
    smoothScrollCodeViewToItem(viewer, itemId);
    return;
  }

  const distance = targetTop - currentTop;
  const smoothDistance = viewportHeight * CODE_VIEW_SMOOTH_SCROLL_VIEWPORTS;
  const stagedScrollThreshold =
    viewportHeight * CODE_VIEW_STAGED_SCROLL_THRESHOLD_VIEWPORTS;

  if (Math.abs(distance) <= stagedScrollThreshold) {
    smoothScrollCodeViewToItem(viewer, itemId);
    return;
  }

  viewer.scrollTo({
    type: 'position',
    position: Math.max(0, targetTop - Math.sign(distance) * smoothDistance),
    behavior: 'instant',
  });

  waitForAnimationFrames(CODE_VIEW_STAGED_SCROLL_FRAME_DELAY, () => {
    if (shouldContinue()) {
      smoothScrollCodeViewToItem(viewer, itemId);
    }
  });
}

function smoothScrollCodeViewToItem(
  viewer: CodeViewHandle<AttemptReviewLineCommentAnnotation>,
  itemId: string
) {
  viewer.scrollTo({
    type: 'item',
    id: itemId,
    align: 'start',
    behavior: 'smooth',
  });
}

function waitForAnimationFrames(frameCount: number, callback: () => void) {
  if (frameCount <= 0) {
    callback();
    return;
  }

  window.requestAnimationFrame(() => {
    waitForAnimationFrames(frameCount - 1, callback);
  });
}

function waitForPageBottom(
  callback: () => void,
  shouldContinue: () => boolean
) {
  let frameCount = 0;

  function tick() {
    if (!shouldContinue()) {
      return;
    }

    if (isPageAtBottom() || frameCount >= PAGE_BOTTOM_WAIT_MAX_FRAMES) {
      callback();
      return;
    }

    frameCount += 1;
    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
}

function isPageAtBottom(): boolean {
  return getPageMaxScrollTop() - window.scrollY <= PAGE_BOTTOM_EPSILON;
}

function getPageMaxScrollTop(): number {
  const pageScroller = document.scrollingElement;

  if (!pageScroller) {
    return 0;
  }

  return Math.max(0, pageScroller.scrollHeight - pageScroller.clientHeight);
}
