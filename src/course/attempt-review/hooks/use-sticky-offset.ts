import { useCallback, useLayoutEffect, type RefObject } from 'react';

export function useAttemptReviewStickyOffset({
  pageHeaderRef,
  pageRootRef,
  isDesktopReviewLayout,
}: {
  pageHeaderRef: RefObject<HTMLElement | null>;
  pageRootRef: RefObject<HTMLElement | null>;
  isDesktopReviewLayout: boolean;
}) {
  const updateStickyOffset = useCallback(() => {
    const header = pageHeaderRef.current;
    const pageRoot = pageRootRef.current;

    if (!header || !pageRoot) {
      return;
    }

    pageRoot.style.setProperty(
      '--attempt-review-sticky-top',
      `${Math.ceil(header.getBoundingClientRect().height)}px`
    );
  }, [pageHeaderRef, pageRootRef]);

  useLayoutEffect(() => {
    const header = pageHeaderRef.current;

    if (!header) {
      return;
    }

    updateStickyOffset();

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateStickyOffset);

    resizeObserver?.observe(header, { box: 'border-box' });
    header.addEventListener('transitionend', updateStickyOffset);
    window.addEventListener('resize', updateStickyOffset);

    return () => {
      resizeObserver?.disconnect();
      header.removeEventListener('transitionend', updateStickyOffset);
      window.removeEventListener('resize', updateStickyOffset);
    };
  }, [pageHeaderRef, updateStickyOffset]);

  useLayoutEffect(() => {
    updateStickyOffset();

    const animationFrame = window.requestAnimationFrame(updateStickyOffset);
    const transitionTimeout = window.setTimeout(updateStickyOffset, 240);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(transitionTimeout);
    };
  }, [isDesktopReviewLayout, updateStickyOffset]);
}
