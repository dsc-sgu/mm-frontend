import { useCallback, useRef, type PointerEvent, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BlockSelectionPlugin,
  useBlockSelected,
} from '@platejs/selection/react';
import { type PlateElementProps, PlateElement } from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';
import { useCoursePageBlockGutterAlignment } from '@/features/course/features/page-edit/hooks/use-block-gutter-alignment';
import { useCoursePageEditStore } from '@/features/course/features/page-edit/hooks/use-editor-store';
import {
  getCoursePageBlockTargetKey,
  type CoursePageBlockTarget,
} from '@/features/course/features/page-edit/model/block-target';
import type { CoursePlateElement } from '@/features/course/features/page-edit/model/plate-content';
import { CoursePageBlockMenu } from '@/features/course/features/page-edit/ui/block-menu';

type BlockFrameContentTag = keyof Pick<
  HTMLElementTagNameMap,
  'blockquote' | 'div' | 'figure' | 'h1' | 'h2' | 'h3'
>;

type CoursePageBlockFrameProps = PlateElementProps & {
  alignGutterToEditorContent?: boolean;
  children: ReactNode;
  contentAs?: BlockFrameContentTag;
  contentClassName?: string;
  frameClassName?: string;
};

function getBlockTarget(
  element: CoursePlateElement,
  path: PlateElementProps['path']
): CoursePageBlockTarget {
  return typeof element.id === 'string'
    ? { source: 'id', id: element.id, path }
    : { source: 'path', path };
}

export function CoursePageBlockFrame({
  alignGutterToEditorContent = false,
  children,
  contentAs,
  contentClassName,
  frameClassName,
  ...props
}: CoursePageBlockFrameProps) {
  const hideInsertPanelPreview = useCoursePageEditStore(
    (state) => state.hideInsertPanelPreview
  );
  const showInsertPanelPreview = useCoursePageEditStore(
    (state) => state.showInsertPanelPreview
  );
  const element = props.element as CoursePlateElement;
  const blockTarget = getBlockTarget(element, props.path);
  const blockTargetKey = getCoursePageBlockTargetKey(blockTarget);
  const isTopLevelBlock = props.path.length === 1;
  const {
    attributes: sortableAttributes,
    isDragging,
    listeners: sortableListeners,
    setActivatorNodeRef,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
  } = useSortable({
    id: blockTargetKey,
    disabled: !isTopLevelBlock,
  });
  const isSelected = useBlockSelected(element.id);
  const isInsertPanelTargetHovered = useCoursePageEditStore(
    (state) => state.hoveredInsertPanelTargetKey === blockTargetKey
  );
  const blockRef = useRef<HTMLElement | null>(null);
  const Content = contentAs ?? 'div';

  const setBlockRef = useCallback(
    (node: HTMLElement | null) => {
      blockRef.current = node;
      setSortableNodeRef(node);
    },
    [setSortableNodeRef]
  );

  const gutterStyle = useCoursePageBlockGutterAlignment({
    blockRef,
    enabled: alignGutterToEditorContent,
    refreshKey: `${String(element.listStyleType)}:${String(element.indent)}`,
  });

  function handleDragHandlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    sortableListeners?.onPointerDown?.(event);

    if (event.button === 0) {
      // Radix opens DropdownMenuTrigger on pointer down. Prevent that default
      // trigger behavior while preserving dnd-kit's activator; a completed
      // click opens the menu only after pointer up.
      event.preventDefault();
    }
  }

  function selectCurrentBlock({
    preserveExisting = false,
  }: {
    preserveExisting?: boolean;
  } = {}) {
    if (typeof element.id !== 'string') {
      return;
    }

    const blockSelection =
      props.editor.getApi(BlockSelectionPlugin).blockSelection;

    if (!preserveExisting || !blockSelection.has(element.id)) {
      blockSelection.set(element.id);
    }

    blockSelection.focus();
  }

  return (
    <PlateElement
      as="div"
      {...props}
      ref={setBlockRef}
      className={cn(
        'group/course-page-block relative',
        'transition-colors outline-none',
        props.className,
        frameClassName
      )}
      style={{
        ...props.style,
        transform: CSS.Translate.toString(
          transform ? { ...transform, x: 0 } : null
        ),
        transition,
        zIndex: isDragging ? 40 : props.style?.zIndex,
        opacity: isDragging ? 0.65 : props.style?.opacity,
      }}
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
          'group/course-page-gutter absolute top-0 bottom-0 -left-5 z-10 sm:-left-8',
          'flex items-stretch gap-1',
          'opacity-0 transition-opacity',
          'group-focus-within/course-page-block:opacity-100',
          'group-hover/course-page-block:opacity-100',
          (isSelected || isInsertPanelTargetHovered) && 'opacity-100'
        )}
        style={gutterStyle}
      >
        <CoursePageBlockMenu
          editor={props.editor}
          target={blockTarget}
          onOpen={() => selectCurrentBlock({ preserveExisting: true })}
        >
          {({ openMenu }) => (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...sortableAttributes}
              {...sortableListeners}
              onPointerDown={handleDragHandlePointerDown}
              className={cn(
                'flex h-full w-4 cursor-grab touch-none items-center justify-center',
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
              data-plate-prevent-deselect="true"
              data-course-page-block-drag-handle={blockTargetKey}
              onMouseEnter={(event) => showInsertPanelPreview(event.clientY)}
              onMouseMove={(event) => showInsertPanelPreview(event.clientY)}
              onMouseLeave={hideInsertPanelPreview}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!isDragging) {
                  openMenu();
                }
              }}
            >
              <span
                className="pointer-events-none flex flex-col items-center gap-1"
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

      <Content className={contentClassName}>{children}</Content>
    </PlateElement>
  );
}
