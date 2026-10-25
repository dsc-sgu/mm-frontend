// PROTOTYPE (#121): window virtualizer for fixed-height quick-grading rows.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  useWindowVirtualizer,
  type Virtualizer,
} from '@tanstack/react-virtual';

export const ROW_GAP = 0;

export type RowsVirtualizer = Virtualizer<Window, Element>;

export function useFixedRowsVirtualizer({
  count,
  rowHeight,
  getKey,
}: {
  count: number;
  rowHeight: number;
  getKey: (index: number) => string | number;
}) {
  'use no memo';

  const [setListRef, scrollMargin] = useElementPageOffsetTop<HTMLDivElement>();
  const virtualizer = useWindowVirtualizer({
    count,
    estimateSize: () => rowHeight,
    getItemKey: getKey,
    gap: ROW_GAP,
    overscan: 8,
    scrollMargin,
  });

  return { virtualizer, setListRef, scrollMargin };
}

function useElementPageOffsetTop<TElement extends HTMLElement>() {
  const elementRef = useRef<TElement | null>(null);
  const [offsetTop, setOffsetTop] = useState(0);

  const measureOffsetTop = useCallback(() => {
    const element = elementRef.current;

    if (element) {
      setOffsetTop(element.getBoundingClientRect().top + window.scrollY);
    }
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
    window.addEventListener('resize', measureOffsetTop);
    return () => window.removeEventListener('resize', measureOffsetTop);
  }, [measureOffsetTop]);

  return [setElementRef, offsetTop] as const;
}
