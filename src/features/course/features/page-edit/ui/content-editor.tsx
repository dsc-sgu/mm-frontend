import { memo, useCallback, useMemo, useRef, type RefObject } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { SlateEditor, Value } from 'platejs';
import {
  Plate,
  PlateContent,
  useEditorValue,
  usePlateEditor,
} from 'platejs/react';

import { exitCourseStructuredBlock } from '@/features/course/features/page-edit/model/block-exit';
import { moveTopLevelBlockByKey } from '@/features/course/features/page-edit/model/block-operations';
import { getCoursePageBlockTargetKey } from '@/features/course/features/page-edit/model/block-target';
import type { CoursePageContentEditorReset } from '@/features/course/features/page-edit/model/editor-store';
import {
  deserializeCourseContentToPlate,
  serializePlateToCourseContent,
  type CoursePlateElement,
} from '@/features/course/features/page-edit/model/plate-content';
import { coursePagePlatePlugins } from '@/features/course/features/page-edit/model/plate-plugins';
import { useCoursePageEditStore } from '@/features/course/features/page-edit/hooks/use-editor-store';
import { CoursePageBlockInsertPanel } from '@/features/course/features/page-edit/ui/block-insert-panel';
import { CoursePageSlashMenu } from '@/features/course/features/page-edit/ui/slash-menu';

const COURSE_PAGE_DRAG_KEYBOARD_CODES = {
  start: ['Space'],
  cancel: ['Escape'],
  end: ['Space'],
};

const COURSE_PAGE_DRAG_SCREEN_READER_INSTRUCTIONS = {
  draggable:
    'Чтобы переместить блок, нажмите пробел. Используйте стрелки для выбора позиции, пробел для подтверждения и Escape для отмены. Нажмите Enter, чтобы открыть меню блока.',
};

function blurCoursePageDragActivator(event: KeyboardEvent) {
  if (event.target instanceof HTMLElement) {
    event.target.blur();
  }
}

function focusCoursePageDragHandle(container: HTMLElement, dragId: string) {
  const dragHandle = Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      'button[data-course-page-block-drag-handle]'
    )
  ).find((button) => button.dataset.coursePageBlockDragHandle === dragId);

  dragHandle?.focus();
}

function CoursePageSortableEditor({
  editor,
  editorContainerRef,
  setEditorContainerRef,
}: {
  editor: SlateEditor;
  editorContainerRef: RefObject<HTMLDivElement | null>;
  setEditorContainerRef: (node: HTMLDivElement | null) => void;
}) {
  const value = useEditorValue() as Value;
  const keyboardDragIdRef = useRef<string | null>(null);
  const hideInsertPanel = useCoursePageEditStore(
    (state) => state.hideInsertPanel
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: COURSE_PAGE_DRAG_KEYBOARD_CODES,
      onActivation: ({ event }) => blurCoursePageDragActivator(event),
    })
  );
  const sortableBlockIds = value.flatMap((node, index): string[] => {
    if (
      typeof node !== 'object' ||
      node === null ||
      !('type' in node) ||
      !('children' in node)
    ) {
      return [];
    }

    const element = node as CoursePlateElement;
    const path = [index];

    return [
      getCoursePageBlockTargetKey(
        typeof element.id === 'string'
          ? { source: 'id', id: element.id, path }
          : { source: 'path', path }
      ),
    ];
  });

  function restoreKeyboardDragFocus() {
    const keyboardDragId = keyboardDragIdRef.current;

    keyboardDragIdRef.current = null;

    if (!keyboardDragId) {
      return;
    }

    requestAnimationFrame(() => {
      const container = editorContainerRef.current;

      if (container) {
        focusCoursePageDragHandle(container, keyboardDragId);
      }
    });
  }

  function handleDragStart({ active, activatorEvent }: DragStartEvent) {
    hideInsertPanel();
    keyboardDragIdRef.current =
      activatorEvent instanceof KeyboardEvent ? String(active.id) : null;
  }

  function handleDragCancel() {
    hideInsertPanel();
    restoreKeyboardDragFocus();
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    hideInsertPanel();

    if (over) {
      moveTopLevelBlockByKey(editor, String(active.id), String(over.id));
    }

    restoreKeyboardDragFocus();
  }

  return (
    <DndContext
      accessibility={{
        screenReaderInstructions: COURSE_PAGE_DRAG_SCREEN_READER_INSTRUCTIONS,
      }}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortableBlockIds}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setEditorContainerRef}
          data-course-page-editor-container="true"
          className="relative [&_.slate-selected]:bg-primary/8"
        >
          <CoursePageBlockInsertPanel editor={editor} />
          <CoursePageSlashMenu
            containerRef={editorContainerRef}
            editor={editor}
          />
          <PlateContent
            data-course-page-editor-content="true"
            className={
              'min-h-64 px-1 py-2 outline-none selection:bg-primary/20'
            }
            spellCheck={false}
            onKeyDown={(event) => {
              if (exitCourseStructuredBlock(editor, event.nativeEvent)) {
                event.preventDefault();
              }
            }}
          />
        </div>
      </SortableContext>
    </DndContext>
  );
}

function CoursePagePlateEditor({
  contentEditorReset,
}: {
  contentEditorReset: CoursePageContentEditorReset;
}) {
  const setContentFromEditor = useCoursePageEditStore(
    (state) => state.setContentFromEditor
  );
  const initialValue = useMemo(
    () => deserializeCourseContentToPlate(contentEditorReset.initialContent),
    // Plate owns live content after initialization. Recompute the initial value
    // only when reset bumps the editor revision, not on every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentEditorReset.revision]
  );
  const editor = usePlateEditor(
    {
      id: `course-page-content-${contentEditorReset.revision}`,
      plugins: coursePagePlatePlugins,
      value: initialValue,
    },
    [contentEditorReset.revision]
  );
  const setContentEditorContainer = useCoursePageEditStore(
    (state) => state.setContentEditorContainer
  );
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const setEditorContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      editorContainerRef.current = node;
      setContentEditorContainer(node);
    },
    [setContentEditorContainer]
  );

  return (
    <Plate
      editor={editor}
      onValueChange={({ value }) => {
        setContentFromEditor({
          content: serializePlateToCourseContent(value),
          editorRevision: contentEditorReset.revision,
        });
      }}
    >
      <CoursePageSortableEditor
        editor={editor}
        editorContainerRef={editorContainerRef}
        setEditorContainerRef={setEditorContainerRef}
      />
    </Plate>
  );
}

function CoursePageContentEditorBase() {
  const contentEditorReset = useCoursePageEditStore(
    (state) => state.contentEditorReset
  );
  // This component intentionally does not subscribe to workingCopy.content:
  // Plate owns the live document while the user edits, and local Plate changes
  // already flow into Zustand through onValueChange. The reset-only content
  // snapshot is updated together with its revision, so editor remounts
  // never depend on a reactive live document read during render.

  return (
    <CoursePagePlateEditor
      key={contentEditorReset.revision}
      contentEditorReset={contentEditorReset}
    />
  );
}

export const CoursePageContentEditor = memo(CoursePageContentEditorBase);
