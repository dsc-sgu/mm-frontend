// PROTOTYPE (#181): the statement edited by the very editor of the Course Page
// editor (blocks, drag handles, «/» menu, selection toolbar). It runs on its
// own edit store, so it does not touch the page being edited; the statement
// stays Markdown in the sandbox and is converted at the edges.
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { cn } from '@/shadcn/lib/utils';
import type { CourseContentBlockItem } from '@/features/course/features/page/model/types';
import { createCoursePageEditStore } from '@/features/course/features/page-edit/model/editor-store';
import { CoursePageEditStoreProvider } from '@/features/course/features/page-edit/hooks/use-editor-store';
import { CoursePageContentEditor } from '@/features/course/features/page-edit/ui/content-editor';
import { PrototypeAssignmentContext } from '@/features/course/prototype/task-and-deadline-settings/assignment-slot';
import {
  courseContentToMarkdown,
  markdownToCourseContent,
} from '@/features/course/prototype/task-and-deadline-settings/panel/statement/markdown-bridge';

function openStatement(markdown: string) {
  const content = markdownToCourseContent(markdown);

  return {
    store: createCoursePageEditStore({
      course: {
        courseId: 'task-statement',
        title: 'Условие задания',
        shortTitle: 'Условие',
        description: '',
        teachers: [],
        iconName: 'book-open',
        color: 'blue',
        resources: { images: [], files: [], assignments: [] },
        content,
      },
    }),
    // Opening a statement must not count as an edit: a document equal to the
    // normalized one reports the original Markdown.
    synced: {
      markdown,
      normalized: courseContentToMarkdown(content),
    },
  };
}

export function PageStatementEditor({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [opened] = useState(() => openStatement(value));
  const { store } = opened;
  const synced = useRef(opened.synced);
  const emitted = useRef(value);
  const emit = useEffectEvent(onChange);

  // Edits made in the editor flow back to the form as Markdown.
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.workingCopy.content === previous.workingCopy.content) return;

        const markdown = courseContentToMarkdown(state.workingCopy.content);
        const next =
          markdown === synced.current.normalized
            ? synced.current.markdown
            : markdown;

        if (next === emitted.current) return;
        emitted.current = next;
        emit(next);
      }),
    [store]
  );

  // The form can change under the editor: «Взять его версию», another Task.
  useEffect(() => {
    if (value === emitted.current) return;

    const content = markdownToCourseContent(value);

    synced.current = {
      markdown: value,
      normalized: courseContentToMarkdown(content),
    };
    emitted.current = value;
    reopen(store, content);
  }, [store, value]);

  return (
    <CoursePageEditStoreProvider store={store}>
      {/* A Task Reference in a statement must not create a Task. */}
      <PrototypeAssignmentContext.Provider value={null}>
        <div
          inert={disabled}
          aria-label="Условие"
          className={cn(disabled && 'cursor-not-allowed opacity-60', className)}
        >
          <CoursePageContentEditor editorId="task-statement" />
        </div>
      </PrototypeAssignmentContext.Provider>
    </CoursePageEditStoreProvider>
  );
}

function reopen(
  store: ReturnType<typeof openStatement>['store'],
  content: CourseContentBlockItem[]
) {
  const state = store.getState();

  store.setState({
    workingCopy: { ...state.workingCopy, content },
    contentEditorReset: {
      initialContent: content,
      revision: state.contentEditorReset.revision + 1,
    },
  });
}
