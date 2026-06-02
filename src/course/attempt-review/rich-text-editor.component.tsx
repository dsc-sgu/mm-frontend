import { useEffect, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Code,
  Code2,
  ImagePlus,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Unlink,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

interface RichTextEditorProps {
  value: string;
  editable?: boolean;
  placeholder?: string;
  minHeightClassName?: string;
  className?: string;
  onChange?: (value: string) => void;
}

export function RichTextEditor({
  value,
  editable = true,
  placeholder = 'Напишите комментарий…',
  minHeightClassName = 'min-h-32',
  className,
  onChange,
}: RichTextEditorProps) {
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
      onChange?.(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'attempt-review-editor-content prose prose-sm max-w-none rounded-b-xl px-3 py-3 focus:outline-none dark:prose-invert',
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
        'attempt-review-editor rounded-xl border bg-card',
        className
      )}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

export function RichTextContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Нет сохранённого текста.
      </p>
    );
  }

  return (
    <div
      className={cn(
        'attempt-review-editor-readonly prose prose-sm max-w-none dark:prose-invert',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const disabled = !editor;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-xl border-b bg-muted/40 p-1.5">
      <ToolbarButton
        label="Жирный текст"
        active={editor?.isActive('bold')}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Курсив"
        active={editor?.isActive('italic')}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Встроенный код"
        active={editor?.isActive('code')}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      >
        <Code className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Блок кода"
        active={editor?.isActive('codeBlock')}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Маркированный список"
        active={editor?.isActive('bulletList')}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Нумерованный список"
        active={editor?.isActive('orderedList')}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Добавить внутреннюю или внешнюю ссылку"
        active={editor?.isActive('link')}
        disabled={disabled}
        onClick={() => {
          if (!editor) {
            return;
          }

          const previousUrl = editor.getAttributes('link').href as
            | string
            | undefined;
          const url = window.prompt('URL ссылки', previousUrl ?? '');

          if (url === null) {
            return;
          }

          if (url.trim() === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }

          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url.trim() })
            .run();
        }}
      >
        <LinkIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Убрать ссылку"
        disabled={disabled || !editor?.isActive('link')}
        onClick={() =>
          editor?.chain().focus().extendMarkRange('link').unsetLink().run()
        }
      >
        <Unlink className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Вставить изображение по URL"
        disabled={disabled}
        onClick={() => {
          const url = window.prompt('URL изображения');

          if (url?.trim()) {
            editor?.chain().focus().setImage({ src: url.trim() }).run();
          }
        }}
      >
        <ImagePlus className="size-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Button>
  );
}
