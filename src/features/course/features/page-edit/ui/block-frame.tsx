import { useCallback, useRef, type PointerEvent, type ReactNode } from 'react';
import { type PlateElementProps, PlateElement } from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';
import { useCoursePageBlockGutterAlignment } from '@/features/course/features/page-edit/hooks/use-block-gutter-alignment';
import { useCoursePageEditStore } from '@/features/course/features/page-edit/hooks/use-editor-store';
import {
  isCoursePageBlockSelected,
  type CoursePageBlockSelectionTarget,
} from '@/features/course/features/page-edit/model/block-selection';
import { getCoursePageBlockTargetKey } from '@/features/course/features/page-edit/model/block-target';
import { selectBlock as selectSlateBlock } from '@/features/course/features/page-edit/model/block-operations';
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

function getSelectionTarget(
  element: CoursePlateElement,
  path: PlateElementProps['path']
): CoursePageBlockSelectionTarget {
  return typeof element.id === 'string'
    ? { source: 'id', id: element.id, path }
    : { source: 'path', path };
}

function isPrimaryPointerEvent(event: PointerEvent<HTMLElement>) {
  return event.button === 0;
}

export function CoursePageBlockFrame({
  alignGutterToEditorContent = false,
  children,
  contentAs,
  contentClassName,
  frameClassName,
  ...props
}: CoursePageBlockFrameProps) {
  const clearBlockSelection = useCoursePageEditStore(
    (state) => state.clearBlockSelection
  );
  const hideInsertPanelPreview = useCoursePageEditStore(
    (state) => state.hideInsertPanelPreview
  );
  const selectOnlyBlock = useCoursePageEditStore(
    (state) => state.selectOnlyBlock
  );
  const showInsertPanelPreview = useCoursePageEditStore(
    (state) => state.showInsertPanelPreview
  );
  const element = props.element as CoursePlateElement;
  const selectionTarget = getSelectionTarget(element, props.path);
  const selectionTargetKey = getCoursePageBlockTargetKey(selectionTarget);
  const isSelected = useCoursePageEditStore((state) =>
    isCoursePageBlockSelected(state.blockSelection, selectionTarget)
  );
  const isInsertPanelTargetHovered = useCoursePageEditStore(
    (state) => state.hoveredInsertPanelTargetKey === selectionTargetKey
  );
  const blockRef = useRef<HTMLElement | null>(null);
  const Content = contentAs ?? 'div';

  const setBlockRef = useCallback((node: HTMLElement | null) => {
    blockRef.current = node;
  }, []);

  const gutterStyle = useCoursePageBlockGutterAlignment({
    blockRef,
    enabled: alignGutterToEditorContent,
    refreshKey: `${String(element.listStyleType)}:${String(element.indent)}`,
  });

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
          editor={props.editor}
          target={selectionTarget}
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
              onMouseEnter={(event) => showInsertPanelPreview(event.clientY)}
              onMouseMove={(event) => showInsertPanelPreview(event.clientY)}
              onMouseLeave={hideInsertPanelPreview}
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
