// PROTOTYPE (#181): WYSIWYG editor for the Task statement, built on Plate.
// The value in and out is Markdown; see `plugins.ts`.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  SquareCode,
} from 'lucide-react';
import { toggleList } from '@platejs/list';
import { KEYS, type SlateEditor } from 'platejs';
import {
  Plate,
  PlateContent,
  useEditorRef,
  useEditorSelector,
  usePlateEditor,
} from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';
import {
  markdownToValue,
  statementPlugins,
  valueToMarkdown,
} from '@/features/course/prototype/task-and-deadline-settings/panel/statement/plugins';

type Synced = {
  // The Markdown last received from outside…
  markdown: string;
  // …and how Plate writes it back. Opening a statement must not count as an
  // edit, so a document equal to this one reports the original Markdown.
  normalized: string;
};

export function StatementEditor({
  value,
  onChange,
  disabled,
  autoFocus,
  className,
  contentClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const editor = usePlateEditor({
    plugins: statementPlugins,
    value: (current) => markdownToValue(current, value),
  });
  const [initial] = useState<Synced>(() => ({
    markdown: value,
    normalized: valueToMarkdown(editor),
  }));
  const synced = useRef(initial);
  const emitted = useRef(value);

  // The form can change under the editor: «Взять его версию», another Task.
  useEffect(() => {
    if (value === emitted.current) return;

    editor.tf.setValue(markdownToValue(editor, value));
    synced.current = { markdown: value, normalized: valueToMarkdown(editor) };
    emitted.current = value;
  }, [editor, value]);

  return (
    <Plate
      editor={editor}
      readOnly={disabled}
      onValueChange={({ editor: current }) => {
        const markdown = valueToMarkdown(current);
        const next =
          markdown === synced.current.normalized
            ? synced.current.markdown
            : markdown;

        if (next === emitted.current) return;
        emitted.current = next;
        onChange(next);
      }}
    >
      <div
        className={cn(
          'flex flex-col rounded-lg border border-transparent bg-muted/50',
          'focus-within:border-ring focus-within:bg-background',
          'focus-within:ring-[3px] focus-within:ring-ring/30',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        {disabled ? null : <Toolbar />}
        <PlateContent
          aria-label="Условие"
          autoFocus={autoFocus}
          placeholder="Что сделать, как сдать, как будем проверять"
          className={cn('min-h-28 px-3 py-1.5 outline-none', contentClassName)}
        />
      </div>
    </Plate>
  );
}

function Toolbar() {
  const editor = useEditorRef();
  const has = {
    bold: useEditorSelector((e) => e.api.hasMark(KEYS.bold), []),
    italic: useEditorSelector((e) => e.api.hasMark(KEYS.italic), []),
    code: useEditorSelector((e) => e.api.hasMark(KEYS.code), []),
    h2: useEditorSelector((e) => isBlock(e, KEYS.h2), []),
    h3: useEditorSelector((e) => isBlock(e, KEYS.h3), []),
    quote: useEditorSelector((e) => isBlock(e, KEYS.blockquote), []),
    codeBlock: useEditorSelector((e) => isBlock(e, KEYS.codeBlock), []),
    ul: useEditorSelector((e) => isList(e, KEYS.ul), []),
    ol: useEditorSelector((e) => isList(e, KEYS.ol), []),
  };

  function run(action: () => void) {
    action();
    editor.tf.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label="Форматирование условия"
      className="flex flex-wrap items-center gap-0.5 border-b border-border/60 p-1"
    >
      <ToolbarButton
        label="Заголовок"
        active={has.h2}
        onClick={() => run(() => editor.tf.toggleBlock(KEYS.h2))}
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        label="Подзаголовок"
        active={has.h3}
        onClick={() => run(() => editor.tf.toggleBlock(KEYS.h3))}
      >
        <Heading3 />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        label="Жирный (Ctrl+B)"
        active={has.bold}
        onClick={() => run(() => editor.tf.toggleMark(KEYS.bold))}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="Курсив (Ctrl+I)"
        active={has.italic}
        onClick={() => run(() => editor.tf.toggleMark(KEYS.italic))}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="Код в строке (Ctrl+E)"
        active={has.code}
        onClick={() => run(() => editor.tf.toggleMark(KEYS.code))}
      >
        <Code />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        label="Маркированный список"
        active={has.ul}
        onClick={() =>
          run(() => toggleList(editor, { listStyleType: KEYS.ul }))
        }
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="Нумерованный список"
        active={has.ol}
        onClick={() =>
          run(() => toggleList(editor, { listStyleType: KEYS.ol }))
        }
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="Цитата"
        active={has.quote}
        onClick={() => run(() => editor.tf.toggleBlock(KEYS.blockquote))}
      >
        <Quote />
      </ToolbarButton>
      <ToolbarButton
        label="Блок кода"
        active={has.codeBlock}
        onClick={() => run(() => editor.tf.toggleBlock(KEYS.codeBlock))}
      >
        <SquareCode />
      </ToolbarButton>
    </div>
  );
}

function isBlock(editor: SlateEditor, type: string) {
  return (
    Boolean(editor.selection) &&
    editor.api.some({ match: { type: editor.getType(type) } })
  );
}

function isList(editor: SlateEditor, listStyleType: string) {
  return (
    Boolean(editor.selection) &&
    editor.api.some({ match: (node) => node.listStyleType === listStyleType })
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      // Keep the caret in the editor.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
        '[&_svg]:size-4',
        active && 'bg-accent text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />;
}
