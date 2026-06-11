import { useEffect, useRef, type RefObject } from 'react';

const SCROLL_EPSILON = 0.5;
const WHEEL_GESTURE_IDLE_MS = 140;

type ScrollableElement = HTMLElement | Element;

type AttemptReviewScrollHandoffOptions = {
  enabled: boolean;
  rootRef: RefObject<HTMLElement | null>;
  innerScrollRef: RefObject<HTMLElement | null>;
};

type WheelGestureState = {
  claimedByHandoff: boolean;
  lockedToNestedScroll: boolean;
  deltaSign: 1 | -1;
  lastEventTime: number;
};

export function useAttemptReviewScrollHandoff({
  enabled,
  rootRef,
  innerScrollRef,
}: AttemptReviewScrollHandoffOptions) {
  const wheelGestureStateRef = useRef<WheelGestureState | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const root = rootRef.current;

    if (!root) {
      return;
    }

    const activeRoot = root;

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

      const activeInnerScroller = innerScroller;
      const deltaY = normalizeWheelDeltaY(event);

      if (Math.abs(deltaY) <= SCROLL_EPSILON) {
        return;
      }

      const gestureState = getWheelGestureState({
        deltaY,
        event,
        previousState: wheelGestureStateRef.current,
      });
      const nestedScroller = gestureState.claimedByHandoff
        ? null
        : findScrollableEventTarget({
            event,
            root: activeRoot,
            innerScroller: activeInnerScroller,
          });

      if (gestureState.lockedToNestedScroll) {
        wheelGestureStateRef.current = gestureState;

        if (nestedScroller && canScroll(nestedScroller, deltaY)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (nestedScroller && canScroll(nestedScroller, deltaY)) {
        gestureState.lockedToNestedScroll = true;
        wheelGestureStateRef.current = gestureState;
        return;
      }

      gestureState.claimedByHandoff = true;
      wheelGestureStateRef.current = gestureState;

      event.preventDefault();
      event.stopPropagation();

      handoffWheelDelta({
        deltaY,
        innerScroller: activeInnerScroller,
        pageScroller,
        preferInnerScrollOnUp: isEventInsideElement(event, activeInnerScroller),
      });
    }

    activeRoot.addEventListener('wheel', handleWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      activeRoot.removeEventListener('wheel', handleWheel, {
        capture: true,
      });
    };
  }, [enabled, innerScrollRef, rootRef]);
}

function getWheelGestureState({
  deltaY,
  event,
  previousState,
}: {
  deltaY: number;
  event: WheelEvent;
  previousState: WheelGestureState | null;
}): WheelGestureState {
  const deltaSign = deltaY > 0 ? 1 : -1;
  const lastEventTime = event.timeStamp;
  const isSameGesture =
    previousState !== null &&
    previousState.deltaSign === deltaSign &&
    lastEventTime - previousState.lastEventTime <= WHEEL_GESTURE_IDLE_MS;

  return {
    claimedByHandoff: isSameGesture ? previousState.claimedByHandoff : false,
    lockedToNestedScroll: isSameGesture
      ? previousState.lockedToNestedScroll
      : false,
    deltaSign,
    lastEventTime,
  };
}

function handoffWheelDelta({
  deltaY,
  innerScroller,
  pageScroller,
  preferInnerScrollOnUp,
}: {
  deltaY: number;
  innerScroller: HTMLElement;
  pageScroller: ScrollableElement;
  preferInnerScrollOnUp: boolean;
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

  if (preferInnerScrollOnUp && !isAtScrollStart(innerScroller)) {
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

function findScrollableEventTarget({
  event,
  root,
  innerScroller,
}: {
  event: WheelEvent;
  root: HTMLElement;
  innerScroller: HTMLElement;
}): HTMLElement | null {
  for (const target of event.composedPath()) {
    if (!(target instanceof HTMLElement)) {
      continue;
    }

    if (target === innerScroller) {
      return null;
    }

    if (target === root) {
      return null;
    }

    if (isScrollable(target)) {
      return target;
    }
  }

  return null;
}

function isScrollable(element: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(element);

  return (
    (overflowY === 'auto' || overflowY === 'scroll') &&
    getMaxScrollTop(element) > SCROLL_EPSILON
  );
}

function canScroll(element: ScrollableElement, deltaY: number): boolean {
  return deltaY > 0 ? !isAtScrollEnd(element) : !isAtScrollStart(element);
}

function isEventInsideElement(event: Event, element: HTMLElement): boolean {
  return event.composedPath().includes(element);
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
