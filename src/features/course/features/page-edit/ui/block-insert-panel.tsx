import { Plus } from 'lucide-react';
import type { SlateEditor } from 'platejs';

import { cn } from '@/shadcn/lib/utils';
import {
  insertParagraphRelative,
  insertParagraphRelativeById,
} from '@/features/course/features/page-edit/model/block-operations';
import { useCoursePageEditStore } from '@/features/course/features/page-edit/hooks/use-editor-store';
import type { CoursePageBlockInsertPanelVisibleState } from '@/features/course/features/page-edit/model/editor-store';

function insertParagraphAtTarget(
  editor: SlateEditor,
  state: CoursePageBlockInsertPanelVisibleState
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

export function CoursePageBlockInsertPanel({
  editor,
}: {
  editor: SlateEditor;
}) {
  const hideInsertPanel = useCoursePageEditStore(
    (state) => state.hideInsertPanel
  );
  const insertPanelState = useCoursePageEditStore(
    (state) => state.insertPanelState
  );
  const isInsertPanelHovered = useCoursePageEditStore(
    (state) => state.isInsertPanelHovered
  );
  const setInsertPanelHovered = useCoursePageEditStore(
    (state) => state.setInsertPanelHovered
  );
  const showInsertPanelPreview = useCoursePageEditStore(
    (state) => state.showInsertPanelPreview
  );
  const isVisible = insertPanelState.status === 'visible';

  return (
    <div
      contentEditable={false}
      className="pointer-events-none absolute inset-0 z-30"
    >
      {isVisible && isInsertPanelHovered && (
        <div
          className={cn(
            'pointer-events-none absolute right-0 left-0 h-0.5',
            'bg-foreground/70'
          )}
          style={{ top: insertPanelState.lineY }}
        />
      )}

      <div
        className="group/course-insert-panel pointer-events-auto absolute top-0 bottom-0 -left-20 w-12"
        onMouseEnter={() => setInsertPanelHovered(true)}
        onMouseMove={(event) => showInsertPanelPreview(event.clientY)}
        onMouseLeave={() => {
          setInsertPanelHovered(false);
          hideInsertPanel();
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
            style={{ top: insertPanelState.cursorY }}
            aria-label={
              insertPanelState.placement === 'before'
                ? 'Добавить блок выше'
                : 'Добавить блок ниже'
            }
            onMouseDown={(event) => {
              event.preventDefault();
              insertParagraphAtTarget(editor, insertPanelState);
              hideInsertPanel();
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
