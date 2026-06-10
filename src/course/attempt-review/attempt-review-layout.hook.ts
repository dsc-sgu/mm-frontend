import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react';

export function useAttemptReviewSummaryCompact(): boolean {
  const [isSummaryCompact, setIsSummaryCompact] = useState(false);

  useEffect(() => {
    let animationFrame: number | null = null;

    const updateCompactState = () => {
      animationFrame = null;
      setIsSummaryCompact(window.scrollY > 48);
    };

    const scheduleUpdate = () => {
      if (animationFrame !== null) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateCompactState);
    };

    updateCompactState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  return isSummaryCompact;
}

export function useAttemptReviewStickyOffset({
  pageHeaderRef,
  pageRootRef,
  isDesktopReviewLayout,
  isSummaryCompact,
}: {
  pageHeaderRef: RefObject<HTMLElement | null>;
  pageRootRef: RefObject<HTMLElement | null>;
  isDesktopReviewLayout: boolean;
  isSummaryCompact: boolean;
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
  }, [isDesktopReviewLayout, isSummaryCompact, updateStickyOffset]);
}
