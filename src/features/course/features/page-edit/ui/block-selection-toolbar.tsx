import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Copy, Trash2, X } from 'lucide-react';
import {
  BlockMenuPlugin,
  BlockSelectionPlugin,
} from '@platejs/selection/react';
import { useEditorRef, usePluginOption } from 'platejs/react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

type ToolbarPosition = {
  left: number;
  placement: 'above' | 'below';
  top: number;
};

const VIEWPORT_GAP_PX = 8;
const SELECTION_GAP_PX = 10;
const EMPTY_SELECTED_IDS = new Set<string>();

function getSelectionBounds(selectedIds: Set<string>) {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-course-page-block-id][data-course-page-block-path]'
    )
  ).filter(
    (element) =>
      selectedIds.has(element.dataset.coursePageBlockId ?? '') &&
      !element.dataset.coursePageBlockPath?.includes('.')
  );

  if (elements.length === 0) {
    return null;
  }

  const rects = elements.map((element) => element.getBoundingClientRect());

  return {
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
    elements,
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    top: Math.min(...rects.map((rect) => rect.top)),
  };
}

function getToolbarPosition(
  selectedIds: Set<string>,
  toolbar: HTMLElement
): ToolbarPosition | null {
  const bounds = getSelectionBounds(selectedIds);

  if (
    !bounds ||
    bounds.bottom < 0 ||
    bounds.top > window.innerHeight ||
    bounds.right < 0 ||
    bounds.left > window.innerWidth
  ) {
    return null;
  }

  const toolbarRect = toolbar.getBoundingClientRect();
  const halfToolbarWidth = toolbarRect.width / 2;
  const minimumLeft = VIEWPORT_GAP_PX + halfToolbarWidth;
  const maximumLeft = window.innerWidth - VIEWPORT_GAP_PX - halfToolbarWidth;
  const selectionCenter = (bounds.left + bounds.right) / 2;
  const left = Math.min(
    Math.max(selectionCenter, minimumLeft),
    Math.max(minimumLeft, maximumLeft)
  );
  const hasSpaceAbove =
    bounds.top - SELECTION_GAP_PX >= toolbarRect.height + VIEWPORT_GAP_PX;

  return hasSpaceAbove
    ? {
        left,
        placement: 'above',
        top: bounds.top - SELECTION_GAP_PX,
      }
    : {
        left,
        placement: 'below',
        top: bounds.bottom + SELECTION_GAP_PX,
      };
}

function formatSelectedBlockCount(count: number) {
  const remainder100 = count % 100;
  const remainder10 = count % 10;

  if (remainder100 >= 11 && remainder100 <= 14) {
    return `${count} блоков`;
  }

  if (remainder10 === 1) {
    return `${count} блок`;
  }

  if (remainder10 >= 2 && remainder10 <= 4) {
    return `${count} блока`;
  }

  return `${count} блоков`;
}

export function CoursePageBlockSelectionToolbar() {
  const editor = useEditorRef();
  const selectedIdsOption = usePluginOption(
    BlockSelectionPlugin,
    'selectedIds'
  );
  const isSelectionAreaVisible = usePluginOption(
    BlockSelectionPlugin,
    'isSelectionAreaVisible'
  );
  const openBlockMenuId = usePluginOption(BlockMenuPlugin, 'openId');
  const selectedIds = selectedIdsOption ?? EMPTY_SELECTED_IDS;
  const selectionKey = useMemo(
    () => Array.from(selectedIds).sort().join('\u0000'),
    [selectedIds]
  );
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const shouldShow =
    selectedIds.size > 0 && !isSelectionAreaVisible && !openBlockMenuId;

  useLayoutEffect(() => {
    if (!shouldShow || !toolbarRef.current) {
      return;
    }

    let animationFrame: number | null = null;
    const toolbar = toolbarRef.current;

    function updatePosition() {
      animationFrame = null;
      setPosition(getToolbarPosition(selectedIds, toolbar));
    }

    function schedulePositionUpdate() {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(updatePosition);
    }

    const bounds = getSelectionBounds(selectedIds);
    const resizeObserver = new ResizeObserver(schedulePositionUpdate);

    resizeObserver.observe(toolbar);
    bounds?.elements.forEach((element) => resizeObserver.observe(element));
    schedulePositionUpdate();
    window.addEventListener('resize', schedulePositionUpdate);
    window.addEventListener('scroll', schedulePositionUpdate, true);

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }

      resizeObserver.disconnect();
      window.removeEventListener('resize', schedulePositionUpdate);
      window.removeEventListener('scroll', schedulePositionUpdate, true);
    };
  }, [selectedIds, selectionKey, shouldShow]);

  if (!shouldShow || typeof document === 'undefined') {
    return null;
  }

  const style: CSSProperties = position
    ? {
        left: position.left,
        top: position.top,
        transform:
          position.placement === 'above'
            ? 'translate(-50%, -100%)'
            : 'translate(-50%, 0)',
      }
    : {
        left: 0,
        opacity: 0,
        pointerEvents: 'none',
        top: 0,
        visibility: 'hidden',
      };

  return createPortal(
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Действия с выбранными блоками"
      data-plate-prevent-deselect="true"
      data-course-page-block-selection-toolbar="true"
      className={cn(
        'fixed z-60 flex items-center gap-1 rounded-xl border border-border',
        'bg-popover p-1 text-popover-foreground shadow-lg shadow-black/15',
        'dark:shadow-black/35'
      )}
      style={style}
      onMouseDown={(event) => event.preventDefault()}
    >
      <span className="px-2 text-sm font-medium text-muted-foreground">
        {formatSelectedBlockCount(selectedIds.size)}
      </span>
      <div className="h-5 w-px bg-border" aria-hidden="true" />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="rounded-lg"
        aria-label="Дублировать выбранные блоки"
        title="Дублировать"
        onClick={() =>
          editor.getTransforms(BlockSelectionPlugin).blockSelection.duplicate()
        }
      >
        <Copy className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="rounded-lg text-destructive hover:text-destructive"
        aria-label="Удалить выбранные блоки"
        title="Удалить"
        onClick={() => {
          editor
            .getTransforms(BlockSelectionPlugin)
            .blockSelection.removeNodes();
          editor.getApi(BlockSelectionPlugin).blockSelection.deselect();
        }}
      >
        <Trash2 className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="rounded-lg"
        aria-label="Снять выделение"
        title="Снять выделение"
        onClick={() =>
          editor.getApi(BlockSelectionPlugin).blockSelection.deselect()
        }
      >
        <X className="size-4" />
      </Button>
    </div>,
    document.body
  );
}
