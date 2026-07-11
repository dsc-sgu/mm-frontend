import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

const GUTTER_INLINE_OFFSET_PX = 32;

function getEditorContentInlineStart(container: Element) {
  const editorContent = container.querySelector<HTMLElement>(
    '[data-course-page-editor-content="true"]'
  );

  if (!editorContent) {
    return container.getBoundingClientRect().left;
  }

  const contentStyle = window.getComputedStyle(editorContent);
  const paddingLeft = Number.parseFloat(contentStyle.paddingLeft) || 0;

  return editorContent.getBoundingClientRect().left + paddingLeft;
}

export function useCoursePageBlockGutterAlignment({
  blockRef,
  enabled,
  refreshKey,
}: {
  blockRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  refreshKey: unknown;
}): CSSProperties | undefined {
  const [gutterLeft, setGutterLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    if (!blockRef.current) {
      return;
    }

    const blockElement: HTMLElement = blockRef.current;
    let animationFrameId: number | null = null;

    function updateGutterLeft() {
      const container = blockElement.closest(
        '[data-course-page-editor-container="true"]'
      );

      if (!container) {
        return;
      }

      const nextGutterLeft =
        getEditorContentInlineStart(container) -
        blockElement.getBoundingClientRect().left -
        GUTTER_INLINE_OFFSET_PX;

      setGutterLeft(nextGutterLeft);
    }

    function scheduleUpdateGutterLeft() {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(updateGutterLeft);
    }

    const container = blockElement.closest(
      '[data-course-page-editor-container="true"]'
    );
    const resizeObserver = new ResizeObserver(scheduleUpdateGutterLeft);

    resizeObserver.observe(blockElement);

    if (container) {
      resizeObserver.observe(container);
    }

    updateGutterLeft();
    window.addEventListener('resize', scheduleUpdateGutterLeft);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdateGutterLeft);
    };
  }, [blockRef, enabled, refreshKey]);

  return enabled && gutterLeft !== null ? { left: gutterLeft } : undefined;
}
