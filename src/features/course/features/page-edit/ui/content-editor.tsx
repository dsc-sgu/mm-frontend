import { useCallback, useEffect, useMemo, useRef } from 'react';
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

function getContentKey(content: CourseContentBlockItem[]) {
  return JSON.stringify(content);
}

export function CoursePageContentEditor() {
  const content = useCoursePageEditStore((state) => state.workingCopy.content);
  const setContent = useCoursePageEditStore((state) => state.setContent);
  const initialValue = useMemo(
    () => deserializeCourseContentToPlate(content),
    // Plate owns live content after initialization. This memo is only the first
    // value for the editor instance; external resets are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const editor = usePlateEditor({
    plugins: coursePagePlatePlugins,
    value: initialValue,
  });
  const externalContentKey = getContentKey(content);
  const lastLocalContentKeyRef = useRef(externalContentKey);
  const isSyncingFromPropsRef = useRef(false);
  const setContentEditorContainer = useCoursePageEditStore(
    (state) => state.setContentEditorContainer
  );
  const setEditorContainerRef = useCallback(
    (node: HTMLDivElement | null) => setContentEditorContainer(node),
    [setContentEditorContainer]
  );

  useEffect(() => {
    if (externalContentKey === lastLocalContentKeyRef.current) {
      return;
    }

    const nextValue = deserializeCourseContentToPlate(content);
    isSyncingFromPropsRef.current = true;
    editor.tf.setValue(nextValue);
    lastLocalContentKeyRef.current = externalContentKey;

    queueMicrotask(() => {
      isSyncingFromPropsRef.current = false;
    });
  }, [content, editor, externalContentKey]);

  return (
    <Plate
      editor={editor}
      onValueChange={({ value }) => {
        if (isSyncingFromPropsRef.current) {
          return;
        }

        const nextContent = serializePlateToCourseContent(value);
        lastLocalContentKeyRef.current = getContentKey(nextContent);
        setContent(nextContent);
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
