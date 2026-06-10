import { useEffect, type RefObject } from 'react';

const SCROLL_EPSILON = 0.5;

type ScrollableElement = HTMLElement | Element;

interface AttemptReviewScrollHandoffOptions {
  enabled: boolean;
  innerScrollRef: RefObject<HTMLElement | null>;
}

export function useAttemptReviewScrollHandoff({
  enabled,
  innerScrollRef,
}: AttemptReviewScrollHandoffOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const innerScroller = innerScrollRef.current;

    if (!innerScroller) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.deltaY === 0 ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ) {
        return;
      }

      const innerScroller = innerScrollRef.current;
      const pageScroller = getPageScroller();

      if (!innerScroller || !pageScroller) {
        return;
      }

      const deltaY = normalizeWheelDeltaY(event);

      if (Math.abs(deltaY) <= SCROLL_EPSILON) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      handoffWheelDelta({
        deltaY,
        innerScroller,
        pageScroller,
      });
    }

    innerScroller.addEventListener('wheel', handleWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      innerScroller.removeEventListener('wheel', handleWheel, {
        capture: true,
      });
    };
  }, [enabled, innerScrollRef]);
}

function handoffWheelDelta({
  deltaY,
  innerScroller,
  pageScroller,
}: {
  deltaY: number;
  innerScroller: HTMLElement;
  pageScroller: ScrollableElement;
}) {
  if (deltaY > 0) {
    let remainingDelta = deltaY;

    if (!isAtScrollEnd(pageScroller)) {
      remainingDelta = consumeScrollDelta(pageScroller, remainingDelta);
    }

    if (remainingDelta > SCROLL_EPSILON) {
      consumeScrollDelta(innerScroller, remainingDelta);
    }

    return;
  }

  let remainingDelta = deltaY;

  if (isAtScrollEnd(pageScroller) && !isAtScrollStart(innerScroller)) {
    remainingDelta = consumeScrollDelta(innerScroller, remainingDelta);
  }

  if (remainingDelta < -SCROLL_EPSILON) {
    consumeScrollDelta(pageScroller, remainingDelta);
  }
}

function consumeScrollDelta(
  element: ScrollableElement,
  deltaY: number
): number {
  const currentScrollTop = element.scrollTop;
  const targetScrollTop = clamp(
    currentScrollTop + deltaY,
    0,
    getMaxScrollTop(element)
  );

  element.scrollTop = targetScrollTop;

  const consumedDelta = element.scrollTop - currentScrollTop;

  return deltaY - consumedDelta;
}

function getPageScroller(): Element | null {
  return document.scrollingElement;
}

function getMaxScrollTop(element: ScrollableElement): number {
  return Math.max(0, element.scrollHeight - element.clientHeight);
}

function isAtScrollStart(element: ScrollableElement): boolean {
  return element.scrollTop <= SCROLL_EPSILON;
}

function isAtScrollEnd(element: ScrollableElement): boolean {
  return getMaxScrollTop(element) - element.scrollTop <= SCROLL_EPSILON;
}

function normalizeWheelDeltaY(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
