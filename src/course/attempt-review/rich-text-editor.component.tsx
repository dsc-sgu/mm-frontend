import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';

import { cn } from '@/shadcn/lib/utils';
import { RichTextContent } from './rich-text-content.component';
import { RichTextEditorToolbar } from './rich-text-editor-toolbar.component';

interface RichTextEditorProps {
  value: string;
  editable?: boolean;
  placeholder?: string;
  minHeightClassName?: string;
  className?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onFocus?: () => void;
}

export function RichTextEditor({
  value,
  editable = true,
  placeholder = 'Напишите комментарий…',
  minHeightClassName = 'min-h-32',
  className,
  onChange,
  onBlur,
  onFocus,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onFocusRef = useRef(onFocus);

  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
    onFocusRef.current = onFocus;
  }, [onBlur, onChange, onFocus]);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable,
    immediatelyRender: false,
    onUpdate({ editor: currentEditor }) {
      onChangeRef.current?.(currentEditor.getHTML());
    },
    onBlur({ editor: currentEditor }) {
      onBlurRef.current?.(currentEditor.getHTML());
    },
    onFocus() {
      onFocusRef.current?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          'attempt-review-editor-content prose prose-sm max-w-none rounded-b-xl px-3 py-3 font-sans focus:outline-none dark:prose-invert',
          minHeightClassName
        ),
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor || editor.getHTML() === (value || '')) {
      return;
    }

    editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  if (!editable) {
    return <RichTextContent html={value} className={className} />;
  }

  return (
    <div
      className={cn(
        'attempt-review-editor rounded-xl border bg-card font-sans',
        className
      )}
    >
      <RichTextEditorToolbar editor={editor} />
      <EditorContent editor={editor} className="flex min-h-0 flex-1 flex-col" />
    </div>
  );
}

export { RichTextContent } from './rich-text-content.component';
