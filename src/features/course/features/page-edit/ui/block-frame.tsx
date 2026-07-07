import {
  useEffect,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { type PlateElementProps, PlateElement } from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';
import {
  isCoursePageBlockSelected,
  useCoursePageBlockSelection,
  type CoursePageBlockSelectionTarget,
} from '@/features/course/features/page-edit/model/block-selection';
import { selectBlock as selectSlateBlock } from '@/features/course/features/page-edit/model/block-operations';
import type { CoursePlateElement } from '@/features/course/features/page-edit/model/plate-content';
import { CoursePageBlockMenu } from '@/features/course/features/page-edit/ui/block-menu';

type BlockFrameContentTag = keyof Pick<
  HTMLElementTagNameMap,
  'blockquote' | 'div' | 'figure' | 'h1' | 'h2' | 'h3'
>;

type CoursePageBlockFrameProps = PlateElementProps & {
  children: ReactNode;
  contentAs?: BlockFrameContentTag;
  contentClassName?: string;
  frameClassName?: string;
};

type InsertPanelTargetHoverDetail =
  | { status: 'inactive' }
  | {
      status: 'active';
      target:
        | { source: 'id'; id: string; path: PlateElementProps['path'] }
        | { source: 'path'; path: PlateElementProps['path'] };
    };

function getSelectionTarget(
  element: CoursePlateElement,
  path: PlateElementProps['path']
): CoursePageBlockSelectionTarget {
  return typeof element.id === 'string'
    ? { source: 'id', id: element.id, path }
    : { source: 'path', path };
}

function arePathsEqual(
  first: PlateElementProps['path'],
  second: PlateElementProps['path']
) {
  return (
    first.length === second.length &&
    first.every((segment, index) => segment === second[index])
  );
}

function isInsertPanelTargetHoveringBlock(
  detail: InsertPanelTargetHoverDetail,
  target: CoursePageBlockSelectionTarget
) {
  if (detail.status === 'inactive') {
    return false;
  }

  if (detail.target.source === 'id' && target.source === 'id') {
    return detail.target.id === target.id;
  }

  return arePathsEqual(detail.target.path, target.path);
}

function isPrimaryPointerEvent(event: PointerEvent<HTMLElement>) {
  return event.button === 0;
}

function dispatchInsertPanelPreviewEvent(
  event: MouseEvent<HTMLElement>,
  type: 'show' | 'hide'
) {
  const container = event.currentTarget.closest(
    '[data-course-page-editor-container="true"]'
  );

  if (!container) {
    return;
  }

  container.dispatchEvent(
    new CustomEvent(
      type === 'show'
        ? 'course-page-insert-panel-preview'
        : 'course-page-insert-panel-preview-end',
      { detail: { clientY: event.clientY } }
    )
  );
}

export function CoursePageBlockFrame({
  children,
  contentAs,
  contentClassName,
  frameClassName,
  ...props
}: CoursePageBlockFrameProps) {
  const { clearBlockSelection, selectOnlyBlock, selection } =
    useCoursePageBlockSelection();
  const element = props.element as CoursePlateElement;
  const selectionTarget = getSelectionTarget(element, props.path);
  const isSelected = isCoursePageBlockSelected(selection, selectionTarget);
  const [isInsertPanelTargetHovered, setIsInsertPanelTargetHovered] =
    useState(false);
  const Content = contentAs ?? 'div';

  useEffect(() => {
    function handleInsertPanelTargetHover(event: Event) {
      const detail = (event as CustomEvent<InsertPanelTargetHoverDetail>)
        .detail;

      setIsInsertPanelTargetHovered(
        isInsertPanelTargetHoveringBlock(detail, selectionTarget)
      );
    }

    document.addEventListener(
      'course-page-insert-panel-target-hover',
      handleInsertPanelTargetHover
    );

    return () => {
      document.removeEventListener(
        'course-page-insert-panel-target-hover',
        handleInsertPanelTargetHover
      );
    };
  }, [selectionTarget]);

  function selectCurrentBlock({
    preserveExisting = false,
  }: {
    preserveExisting?: boolean;
  } = {}) {
    if (!selectSlateBlock(props.editor, props.path)) {
      clearBlockSelection();
      return;
    }

    if (preserveExisting && isSelected) {
      return;
    }

    selectOnlyBlock(selectionTarget);
  }

  return (
    <PlateElement
      as="div"
      className={cn(
        'group/course-page-block relative',
        'transition-colors outline-none',
        frameClassName
      )}
      {...props}
      attributes={{
        ...props.attributes,
        'data-course-page-block': 'true',
        'data-course-page-block-id': element.id,
        'data-course-page-block-path': props.path.join('.'),
        onContextMenu: () => selectCurrentBlock({ preserveExisting: true }),
      }}
    >
      <div
        contentEditable={false}
        className={cn(
          'group/course-page-gutter absolute top-0 bottom-0 -left-8 z-10',
          'flex items-stretch gap-1',
          'opacity-0 transition-opacity',
          'group-focus-within/course-page-block:opacity-100',
          'group-hover/course-page-block:opacity-100',
          (isSelected || isInsertPanelTargetHovered) && 'opacity-100'
        )}
      >
        <CoursePageBlockMenu
          onOpen={() => selectCurrentBlock({ preserveExisting: true })}
        >
          {({ openMenu }) => (
            <button
              type="button"
              className={cn(
                'flex h-full w-4 cursor-grab items-center justify-center',
                'rounded-sm border border-transparent text-muted-foreground/70',
                'transition-colors',
                isInsertPanelTargetHovered &&
                  'border-muted/60 bg-muted/25 text-muted-foreground',
                'hover:bg-muted/60 hover:text-foreground',
                'active:cursor-grabbing',
                'focus-visible:ring-2 focus-visible:ring-ring',
                'focus-visible:outline-none'
              )}
              aria-label="Открыть меню блока"
              onMouseEnter={(event) =>
                dispatchInsertPanelPreviewEvent(event, 'show')
              }
              onMouseMove={(event) =>
                dispatchInsertPanelPreviewEvent(event, 'show')
              }
              onMouseLeave={(event) =>
                dispatchInsertPanelPreviewEvent(event, 'hide')
              }
              onPointerDownCapture={(event) => {
                if (!isPrimaryPointerEvent(event)) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
              }}
              onPointerUp={(event) => {
                if (!isPrimaryPointerEvent(event)) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                openMenu();
              }}
            >
              <span
                className="flex flex-col items-center gap-1"
                aria-hidden="true"
              >
                <span className="size-1 rounded-full bg-current" />
                <span className="size-1 rounded-full bg-current" />
                <span className="size-1 rounded-full bg-current" />
              </span>
            </button>
          )}
        </CoursePageBlockMenu>
      </div>

      {isSelected && (
        <div
          contentEditable={false}
          className="pointer-events-none absolute inset-0 z-20 bg-primary/20"
        />
      )}

      <Content className={contentClassName} onMouseDown={clearBlockSelection}>
        {children}
      </Content>
    </PlateElement>
  );
}
