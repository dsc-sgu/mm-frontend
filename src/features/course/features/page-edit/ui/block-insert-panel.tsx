import { Plus } from 'lucide-react';
import type { SlateEditor } from 'platejs';

import { cn } from '@/shadcn/lib/utils';
import {
  insertParagraphRelative,
  insertParagraphRelativeById,
} from '@/features/course/features/page-edit/model/block-operations';
import {
  useCoursePageBlockInsertPanel,
  type CoursePageBlockInsertPanelVisibleState,
} from '@/features/course/features/page-edit/hooks/use-block-insert-panel';

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
  const insertPanel = useCoursePageBlockInsertPanel();
  const { isPanelHovered, state } = insertPanel;
  const isVisible = state.status === 'visible';

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
        onMouseEnter={() => insertPanel.setPanelHovered(true)}
        onMouseMove={(event) => insertPanel.showPreview(event.clientY)}
        onMouseLeave={() => {
          insertPanel.setPanelHovered(false);
          insertPanel.hide();
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
              insertPanel.hide();
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
