import { areReviewTextsEqual } from '@/features/course/features/review/model/text-document';
import { isSafeReviewHref } from '@/features/course/model/links';
import {
  BoldLeaf,
  ItalicLeaf,
  StrikeLeaf,
  CodeLeaf,
  QuoteElement,
  CodeElement,
  CodeLineElement,
  LinkElement,
  ListWrapper,
} from './nodes';
import { useEffect, useRef } from 'react';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import {
  BoldPlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  CodePlugin,
  BlockquotePlugin,
} from '@platejs/basic-nodes/react';
import { LinkPlugin } from '@platejs/link/react';
import { CodeBlockPlugin, CodeLinePlugin } from '@platejs/code-block/react';
import { ListPlugin } from '@platejs/list/react';
import { IndentPlugin } from '@platejs/indent/react';
import {
  toReviewPlate,
  fromReviewPlate,
} from '@/features/course/features/review/model/plate';
import { reviewClipboardHtml } from './paste';
import { RichTextEditorToolbar } from './toolbar';
import { type ReviewTextDocument } from '@/features/course/features/review/model/text-document';
import { matchesShortcut } from '@/features/keyboard/shortcut';
import {
  commentCancelShortcut,
  commentSubmitShortcut,
} from '@/features/course/features/attempt-review/model/shortcuts';
import { cn } from '@/shadcn/lib/utils';
import { RichTextContent } from './content';
import styles from './editor.module.css';

type RichTextEditorProps = {
  value: ReviewTextDocument | null;
  editable?: boolean;
  placeholder?: string;
  minHeightClassName?: string;
  className?: string;
  autoFocus?: boolean;
  onChange?: (value: ReviewTextDocument | null) => void;
  onBlur?: (value: ReviewTextDocument | null) => void;
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
  autoFocus,
  onChange,
  onBlur,
  onFocus,
  onSubmitShortcut,
  onCancelShortcut,
}: RichTextEditorProps) {
  const last = useRef(value);
  const editor = usePlateEditor({
    plugins: [
      BoldPlugin.withComponent(BoldLeaf),
      ItalicPlugin.withComponent(ItalicLeaf),
      StrikethroughPlugin.withComponent(StrikeLeaf),
      CodePlugin.withComponent(CodeLeaf),
      BlockquotePlugin.withComponent(QuoteElement),
      LinkPlugin.configure({
        node: { component: LinkElement },
        options: { isUrl: isSafeReviewHref },
      }),
      CodeBlockPlugin.withComponent(CodeElement),
      CodeLinePlugin.withComponent(CodeLineElement),
      IndentPlugin.configure({
        inject: { targetPlugins: ['p', 'blockquote'] },
      }),
      ListPlugin.configure({
        inject: { targetPlugins: ['p', 'blockquote'] },
        render: {
          belowNodes: (props) =>
            props.element.listStyleType ? ListWrapper : undefined,
        },
      }),
    ],
    value: toReviewPlate(value),
  });
  useEffect(() => {
    if (!areReviewTextsEqual(value, last.current))
      editor.tf.setValue(toReviewPlate(value));
    last.current = value;
  }, [editor, value]);
  useEffect(() => {
    if (autoFocus && editable) editor.tf.focus({ edge: 'end' });
  }, [autoFocus, editable, editor]);
  if (!editable) return <RichTextContent text={value} className={className} />;
  return (
    <div className={cn('rounded-xl border bg-card', className)}>
      <Plate
        editor={editor}
        onValueChange={({ value: children }) => {
          const next = fromReviewPlate(children);
          last.current = next;
          onChange?.(next);
        }}
      >
        <RichTextEditorToolbar />
        <PlateContent
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            'px-3 py-3 outline-none',
            styles.content,
            minHeightClassName
          )}
          onPaste={(event) => {
            if (!editor.selection) editor.tf.focus({ edge: 'end' });
            const html = event.clipboardData.getData('text/html');
            if (html) {
              event.preventDefault();
              editor.tf.insertFragment(reviewClipboardHtml(html));
            } else {
              event.preventDefault();
              editor.tf.insertText(event.clipboardData.getData('text/plain'));
            }
          }}
          onFocus={onFocus}
          onBlur={() => onBlur?.(last.current)}
          onKeyDown={(event) => {
            if (
              onSubmitShortcut &&
              matchesShortcut(event.nativeEvent, commentSubmitShortcut)
            ) {
              event.preventDefault();
              onSubmitShortcut();
            }
            if (
              onCancelShortcut &&
              matchesShortcut(event.nativeEvent, commentCancelShortcut)
            ) {
              event.preventDefault();
              onCancelShortcut();
            }
          }}
        />
      </Plate>
    </div>
  );
}
export { RichTextContent } from './content';
