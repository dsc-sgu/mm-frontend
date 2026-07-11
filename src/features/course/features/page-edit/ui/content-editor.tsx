import { useCallback, useMemo } from 'react';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';
import type { CourseContentBlockItem } from '@/features/course/features/page/model/types';
import {
  deserializeCourseContentToPlate,
  serializePlateToCourseContent,
} from '@/features/course/features/page-edit/model/plate-content';
import { coursePagePlatePlugins } from '@/features/course/features/page-edit/model/plate-plugins';
import { useCoursePageEditStore } from '@/features/course/features/page-edit/hooks/use-editor-store';
import { CoursePageBlockInsertPanel } from '@/features/course/features/page-edit/ui/block-insert-panel';

function CoursePagePlateEditor({
  contentEditorRevision,
  initialContent,
}: {
  contentEditorRevision: number;
  initialContent: CourseContentBlockItem[];
}) {
  const setContent = useCoursePageEditStore((state) => state.setContent);
  const initialValue = useMemo(
    () => deserializeCourseContentToPlate(initialContent),
    // Plate owns live content after initialization. Recompute the initial value
    // only when reset bumps the editor revision, not on every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentEditorRevision]
  );
  const editor = usePlateEditor(
    {
      id: `course-page-content-${contentEditorRevision}`,
      plugins: coursePagePlatePlugins,
      value: initialValue,
    },
    [contentEditorRevision]
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
        setContent(serializePlateToCourseContent(value));
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

export function CoursePageContentEditor() {
  const content = useCoursePageEditStore((state) => state.workingCopy.content);
  const contentEditorRevision = useCoursePageEditStore(
    (state) => state.contentEditorRevision
  );

  return (
    <CoursePagePlateEditor
      key={contentEditorRevision}
      contentEditorRevision={contentEditorRevision}
      initialContent={content}
    />
  );
}
