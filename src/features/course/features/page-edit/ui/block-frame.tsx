import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
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
import {
  isCoursePageBlockTargetEqual,
  type CoursePageBlockTarget,
} from '@/features/course/features/page-edit/model/block-target';
import { selectBlock as selectSlateBlock } from '@/features/course/features/page-edit/model/block-operations';
import type { CoursePlateElement } from '@/features/course/features/page-edit/model/plate-content';
import { CoursePageBlockMenu } from '@/features/course/features/page-edit/ui/block-menu';

type BlockFrameContentTag = keyof Pick<
  HTMLElementTagNameMap,
  'blockquote' | 'div' | 'figure' | 'h1' | 'h2' | 'h3'
>;

const GUTTER_INLINE_OFFSET_PX = 32;

type CoursePageBlockFrameProps = PlateElementProps & {
  alignGutterToEditorContent?: boolean;
  children: ReactNode;
  contentAs?: BlockFrameContentTag;
  contentClassName?: string;
  frameClassName?: string;
};

type InsertPanelTargetHoverDetail =
  | { status: 'inactive' }
  | {
      status: 'active';
      target: CoursePageBlockTarget;
    };

function getSelectionTarget(
  element: CoursePlateElement,
  path: PlateElementProps['path']
): CoursePageBlockSelectionTarget {
  return typeof element.id === 'string'
    ? { source: 'id', id: element.id, path }
    : { source: 'path', path };
}

function isInsertPanelTargetHoveringBlock(
  detail: InsertPanelTargetHoverDetail,
  target: CoursePageBlockSelectionTarget
) {
  return (
    detail.status === 'active' &&
    isCoursePageBlockTargetEqual(detail.target, target)
  );
}

function isPrimaryPointerEvent(event: PointerEvent<HTMLElement>) {
  return event.button === 0;
}

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
  alignGutterToEditorContent = false,
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
  const blockRef = useRef<HTMLElement | null>(null);
  const [gutterLeft, setGutterLeft] = useState<number | null>(null);
  const [isInsertPanelTargetHovered, setIsInsertPanelTargetHovered] =
    useState(false);
  const Content = contentAs ?? 'div';

  const setBlockRef = useCallback((node: HTMLElement | null) => {
    blockRef.current = node;
  }, []);

  useLayoutEffect(() => {
    if (!alignGutterToEditorContent) {
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
  }, [alignGutterToEditorContent, element.indent, element.listStyleType]);

  const gutterStyle: CSSProperties | undefined =
    alignGutterToEditorContent && gutterLeft !== null
      ? { left: gutterLeft }
      : undefined;

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
      ref={setBlockRef}
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
        style={gutterStyle}
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
