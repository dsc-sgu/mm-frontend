import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import type { CourseAttempt } from './model/types';

const VIRTUAL_ATTEMPT_ESTIMATED_HEIGHT = 220;
const VIRTUAL_ATTEMPT_OVERSCAN = 6;
const VIRTUAL_ATTEMPT_GAP = 12;

export function VirtualizedAttemptsList({
  attempts,
  renderAttempt,
}: {
  attempts: CourseAttempt[];
  renderAttempt: (attempt: CourseAttempt) => ReactNode;
}) {
  'use no memo';

  const [setListRef, scrollMargin] = useElementPageOffsetTop<HTMLDivElement>();
  const virtualizer = useWindowVirtualizer({
    count: attempts.length,
    estimateSize: () => VIRTUAL_ATTEMPT_ESTIMATED_HEIGHT,
    getItemKey: (index) => attempts[index]?.id ?? index,
    gap: VIRTUAL_ATTEMPT_GAP,
    overscan: VIRTUAL_ATTEMPT_OVERSCAN,
    scrollMargin,
    measureElement: (element) => element.getBoundingClientRect().height,
  });
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={setListRef}
      className="relative"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualItems.map((virtualItem) => {
        const attempt = attempts[virtualItem.index];

        if (!attempt) {
          return null;
        }

        return (
          <div
            key={virtualItem.key}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${virtualItem.start - scrollMargin}px)`,
            }}
          >
            {renderAttempt(attempt)}
          </div>
        );
      })}
    </div>
  );
}

function useElementPageOffsetTop<TElement extends HTMLElement>() {
  const elementRef = useRef<TElement | null>(null);
  const [offsetTop, setOffsetTop] = useState(0);

  const measureOffsetTop = useCallback(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    setOffsetTop(element.getBoundingClientRect().top + window.scrollY);
  }, []);

  const setElementRef = useCallback(
    (element: TElement | null) => {
      elementRef.current = element;

      if (element) {
        window.requestAnimationFrame(measureOffsetTop);
      }
    },
    [measureOffsetTop]
  );

  useLayoutEffect(() => {
    measureOffsetTop();

    const element = elementRef.current;

    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver(measureOffsetTop);
    resizeObserver.observe(element);
    window.addEventListener('resize', measureOffsetTop);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureOffsetTop);
    };
  }, [measureOffsetTop]);

  return [setElementRef, offsetTop] as const;
}
