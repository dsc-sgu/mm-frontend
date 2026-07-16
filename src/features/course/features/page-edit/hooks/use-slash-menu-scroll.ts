import { useLayoutEffect, useRef } from 'react';

export function useSlashMenuScroll({
  activeIndex,
  activeItemId,
  isOpen,
}: {
  activeIndex: number;
  activeItemId: string | undefined;
  isOpen: boolean;
}) {
  const commandListRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const commandList = commandListRef.current;
    const activeItemElement = activeItemRef.current;

    if (!commandList || !activeItemElement) {
      return;
    }

    if (activeIndex === 0) {
      commandList.scrollTop = 0;
      return;
    }

    const commandListRect = commandList.getBoundingClientRect();
    const activeItemRect = activeItemElement.getBoundingClientRect();

    if (activeItemRect.top < commandListRect.top) {
      commandList.scrollTop -= commandListRect.top - activeItemRect.top;
    } else if (activeItemRect.bottom > commandListRect.bottom) {
      commandList.scrollTop += activeItemRect.bottom - commandListRect.bottom;
    }
  }, [activeIndex, activeItemId, isOpen]);

  return { activeItemRef, commandListRef };
}
