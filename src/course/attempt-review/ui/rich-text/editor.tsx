import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';

import { cn } from '@/shadcn/lib/utils';
import {
  isAttemptReviewCancelShortcutEvent,
  isAttemptReviewSubmitShortcutEvent,
} from '../../model/keyboard-shortcuts';
import { RichTextContent } from './content';
import { RichTextEditorToolbar } from './toolbar';

type RichTextEditorProps = {
  value: string;
  editable?: boolean;
  placeholder?: string;
  minHeightClassName?: string;
  className?: string;
  autoFocus?: boolean;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onFocus?: () => void;
  onSubmitShortcut?: () => void;
  onCancelShortcut?: () => void;
};

export function RichTextEditor({
  value,
  editable = true,
  placeholder = 'Напишите комментарий…',
  minHeightClassName = 'min-h-32',
  className,
  autoFocus = false,
  onChange,
  onBlur,
  onFocus,
  onSubmitShortcut,
  onCancelShortcut,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onFocusRef = useRef(onFocus);
  const hasAutoFocusedRef = useRef(false);
  const onSubmitShortcutRef = useRef(onSubmitShortcut);
  const onCancelShortcutRef = useRef(onCancelShortcut);

  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
    onFocusRef.current = onFocus;
    onSubmitShortcutRef.current = onSubmitShortcut;
    onCancelShortcutRef.current = onCancelShortcut;
  }, [onBlur, onCancelShortcut, onChange, onFocus, onSubmitShortcut]);
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
      handleKeyDown(_view, event) {
        if (
          onSubmitShortcutRef.current &&
          isAttemptReviewSubmitShortcutEvent(event)
        ) {
          event.preventDefault();
          onSubmitShortcutRef.current();
          return true;
        }

        if (
          onCancelShortcutRef.current &&
          isAttemptReviewCancelShortcutEvent(event)
        ) {
          event.preventDefault();
          onCancelShortcutRef.current();
          return true;
        }

        return false;
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
    if (!editor || !editable || !autoFocus || hasAutoFocusedRef.current) {
      return;
    }

    hasAutoFocusedRef.current = true;

    const animationFrame = window.requestAnimationFrame(() => {
      editor.chain().focus('end').run();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [autoFocus, editable, editor]);

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

export { RichTextContent } from './content';
