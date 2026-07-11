import { useCallback, useEffect, useState, type RefObject } from 'react';
import { Plus } from 'lucide-react';
import type { Path, SlateEditor } from 'platejs';

import { cn } from '@/shadcn/lib/utils';
import {
  insertParagraphRelative,
  insertParagraphRelativeById,
} from '@/features/course/features/page-edit/model/block-operations';
import type { CoursePageBlockTarget } from '@/features/course/features/page-edit/model/block-target';

type InsertPlacement = 'before' | 'after';

type InsertPanelState =
  | { status: 'hidden' }
  | {
      status: 'visible';
      cursorY: number;
      lineY: number;
      target: CoursePageBlockTarget;
      placement: InsertPlacement;
    };

type BlockCandidate = {
  element: HTMLElement;
  id?: string;
  path: Path;
  rect: DOMRect;
};

type InsertPanelTargetHoverDetail =
  | { status: 'inactive' }
  | {
      status: 'active';
      target: CoursePageBlockTarget;
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

function getNextPanelState(
  container: HTMLElement,
  cursorY: number
): InsertPanelState {
  const containerRect = container.getBoundingClientRect();
  const nearestBlock = getNearestBlockCandidate(
    getBlockCandidates(container),
    cursorY
  );

  if (!nearestBlock) {
    return { status: 'hidden' };
  }

  const placement: InsertPlacement =
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

function insertParagraphAtTarget(
  editor: SlateEditor,
  state: Extract<InsertPanelState, { status: 'visible' }>
) {
  if (state.target.source === 'id') {
    return insertParagraphRelativeById(
      editor,
      state.target.id,
      state.placement
    );
  }

  return insertParagraphRelative(editor, state.target.path, state.placement);
}

function dispatchTargetHoverEvent(
  container: HTMLElement,
  detail: InsertPanelTargetHoverDetail
) {
  container.dispatchEvent(
    new CustomEvent('course-page-insert-panel-target-hover', {
      bubbles: true,
      detail,
    })
  );
}

export function CoursePageBlockInsertPanel({
  containerRef,
  editor,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  editor: SlateEditor;
}) {
  const [state, setState] = useState<InsertPanelState>({ status: 'hidden' });
  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const isVisible = state.status === 'visible';

  const updateFromCursor = useCallback(
    (cursorY: number) => {
      const container = containerRef.current;

      if (!container) {
        setState({ status: 'hidden' });
        return;
      }

      setState(getNextPanelState(container, cursorY));
    },
    [containerRef]
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (isPanelHovered && state.status === 'visible') {
      dispatchTargetHoverEvent(container, {
        status: 'active',
        target: state.target,
      });
      return;
    }

    dispatchTargetHoverEvent(container, { status: 'inactive' });
  }, [containerRef, isPanelHovered, state]);

  useEffect(() => {
    const container = containerRef.current;

    return () => {
      if (container) {
        dispatchTargetHoverEvent(container, { status: 'inactive' });
      }
    };
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function handlePreview(event: Event) {
      const { clientY } = (event as CustomEvent<{ clientY: number }>).detail;
      updateFromCursor(clientY);
    }

    function handlePreviewEnd() {
      if (!isPanelHovered) {
        setState({ status: 'hidden' });
      }
    }

    container.addEventListener(
      'course-page-insert-panel-preview',
      handlePreview
    );
    container.addEventListener(
      'course-page-insert-panel-preview-end',
      handlePreviewEnd
    );

    return () => {
      container.removeEventListener(
        'course-page-insert-panel-preview',
        handlePreview
      );
      container.removeEventListener(
        'course-page-insert-panel-preview-end',
        handlePreviewEnd
      );
    };
  }, [containerRef, isPanelHovered, updateFromCursor]);

  return (
    <div
      contentEditable={false}
      className="pointer-events-none absolute inset-0 z-30"
    >
      {isVisible && isPanelHovered && (
        <div
          className={cn(
            'pointer-events-none absolute right-0 left-0 h-0.5',
            'bg-foreground/70'
          )}
          style={{ top: state.lineY }}
        />
      )}

      <div
        className="group/course-insert-panel pointer-events-auto absolute top-0 bottom-0 -left-20 w-12"
        onMouseEnter={() => setIsPanelHovered(true)}
        onMouseMove={(event) => updateFromCursor(event.clientY)}
        onMouseLeave={() => {
          setIsPanelHovered(false);
          setState({ status: 'hidden' });
        }}
      >
        {isVisible && (
          <button
            type="button"
            className={cn(
              'absolute left-1/2 flex size-7',
              '-translate-x-1/2 -translate-y-1/2',
              'items-center justify-center rounded-full shadow-sm',
              'bg-muted/80 text-muted-foreground transition-colors',
              'group-hover/course-insert-panel:bg-foreground',
              'group-hover/course-insert-panel:text-background',
              'focus-visible:ring-2 focus-visible:ring-ring',
              'focus-visible:outline-none'
            )}
            style={{ top: state.cursorY }}
            aria-label={
              state.placement === 'before'
                ? 'Добавить блок выше'
                : 'Добавить блок ниже'
            }
            onMouseDown={(event) => {
              event.preventDefault();
              insertParagraphAtTarget(editor, state);
              setState({ status: 'hidden' });
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
