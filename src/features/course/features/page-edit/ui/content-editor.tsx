import { memo, useCallback, useMemo } from 'react';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';
import type { CoursePageContentEditorReset } from '@/features/course/features/page-edit/model/editor-store';
import {
  deserializeCourseContentToPlate,
  serializePlateToCourseContent,
} from '@/features/course/features/page-edit/model/plate-content';
import { coursePagePlatePlugins } from '@/features/course/features/page-edit/model/plate-plugins';
import { useCoursePageEditStore } from '@/features/course/features/page-edit/hooks/use-editor-store';
import { CoursePageBlockInsertPanel } from '@/features/course/features/page-edit/ui/block-insert-panel';

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
  const setEditorContainerRef = useCallback(
    (node: HTMLDivElement | null) => setContentEditorContainer(node),
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
      <div
        ref={setEditorContainerRef}
        data-course-page-editor-container="true"
        className="relative [&_.slate-selected]:bg-primary/8"
      >
        <CoursePageBlockInsertPanel editor={editor} />
        <PlateContent
          data-course-page-editor-content="true"
          className={cn(
            'min-h-64 px-1 py-2 outline-none',
            'selection:bg-primary/20',
            '[&_[data-slate-placeholder=true]]:text-muted-foreground'
          )}
          placeholder="Начните писать…"
          spellCheck={false}
        />
      </div>
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
