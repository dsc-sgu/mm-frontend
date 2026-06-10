import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
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

export function RichTextEditorToolbar({ editor }: { editor: Editor | null }) {
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
        onClick={() => setEditorLink(editor)}
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
        onClick={() => setEditorImage(editor)}
      >
        <ImagePlus className="size-4" />
      </ToolbarButton>
    </div>
  );
}

function setEditorLink(editor: Editor | null) {
  if (!editor) {
    return;
  }

  const previousUrl = editor.getAttributes('link').href as string | undefined;
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
}

function setEditorImage(editor: Editor | null) {
  const url = window.prompt('URL изображения');

  if (url?.trim()) {
    editor?.chain().focus().setImage({ src: url.trim() }).run();
  }
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
