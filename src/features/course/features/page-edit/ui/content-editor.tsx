import { useEffect, useMemo, useRef } from 'react';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';
import type {
  CourseContentBlockItem,
  CoursePageResources,
} from '@/features/course/features/page/model/types';
import {
  deserializeCourseContentToPlate,
  serializePlateToCourseContent,
} from '@/features/course/features/page-edit/model/plate-content';
import { coursePagePlatePlugins } from '@/features/course/features/page-edit/model/plate-plugins';
import { CoursePageEditorResourceProvider } from '@/features/course/features/page-edit/ui/plate/resource-context';

function getContentKey(content: CourseContentBlockItem[]) {
  return JSON.stringify(content);
}

export function CoursePageContentEditor({
  content,
  resources,
  onChange,
}: {
  content: CourseContentBlockItem[];
  resources: CoursePageResources;
  onChange: (content: CourseContentBlockItem[]) => void;
}) {
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
    <CoursePageEditorResourceProvider resources={resources}>
      <Plate
        editor={editor}
        onValueChange={({ value }) => {
          if (isSyncingFromPropsRef.current) {
            return;
          }

          const nextContent = serializePlateToCourseContent(value);
          lastLocalContentKeyRef.current = getContentKey(nextContent);
          onChange(nextContent);
        }}
      >
        <div className="[&_.slate-selected]:bg-primary/8">
          <PlateContent
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
    </CoursePageEditorResourceProvider>
  );
}
