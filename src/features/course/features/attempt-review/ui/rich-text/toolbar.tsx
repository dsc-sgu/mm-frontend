import { toggleCodeBlock } from '@platejs/code-block';
import { useState, useRef } from 'react';
import { useEditorRef } from 'platejs/react';
import { upsertLink, unwrapLink } from '@platejs/link';
import { toggleList } from '@platejs/list';
import { isSafeReviewHref } from '@/features/course/model/links';
import { Button } from '@/shadcn/components/ui/button';
import { Input } from '@/shadcn/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';

type LinkState =
  | { status: 'closed' }
  | { status: 'open'; url: string; error: string | null };

export function RichTextEditorToolbar() {
  const editor = useEditorRef();
  const savedSelection = useRef(editor.selection);
  const [link, setLink] = useState<LinkState>({ status: 'closed' });

  return (
    <div
      className="flex flex-wrap gap-1 border-b p-1.5"
      onMouseDownCapture={() => {
        const selection = window.getSelection();
        const domRange = selection?.rangeCount
          ? editor.api.toSlateRange(selection, {
              exactMatch: false,
              suppressThrow: true,
            })
          : null;

        const range = domRange ?? editor.selection ?? savedSelection.current;

        if (range) {
          savedSelection.current = range;
          editor.tf.select(range);
        }
      }}
    >
      {[
        { mark: 'bold', label: 'Жирный текст' },
        { mark: 'italic', label: 'Курсив' },
        { mark: 'strikethrough', label: 'Зачёркнутый текст' },
        { mark: 'code', label: 'Встроенный код' },
      ].map(({ mark, label }) => (
        <Button
          key={mark}
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            editor.tf.toggleMark(mark);
            editor.tf.focus();
          }}
        >
          {label}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          editor.tf.toggleBlock('blockquote');
          editor.tf.focus();
        }}
      >
        Цитата
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          editor.tf.unwrapNodes({
            match: (node) => node.type === 'blockquote',
            split: true,
          });
          toggleCodeBlock(editor);
          editor.tf.focus();
        }}
      >
        Блок кода
      </Button>
      {['disc', 'decimal'].map((style) => (
        <Button
          key={style}
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            toggleList(editor, { listStyleType: style });
            editor.tf.focus();
          }}
        >
          {style === 'disc' ? 'Маркированный список' : 'Нумерованный список'}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setLink({ status: 'open', url: '', error: null })}
      >
        Ссылка
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          unwrapLink(editor);
          editor.tf.focus();
        }}
      >
        Убрать ссылку
      </Button>
      <Dialog
        open={link.status === 'open'}
        onOpenChange={(open) => {
          if (!open) {
            setLink({ status: 'closed' });
          }
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            editor.tf.focus();
          }}
        >
          <DialogTitle>Ссылка</DialogTitle>
          {link.status === 'open' && (
            <form
              onSubmit={(event) => {
                event.preventDefault();

                if (!isSafeReviewHref(link.url)) {
                  setLink({
                    ...link,
                    error: 'Введите http, https или путь от корня сайта',
                  });
                  return;
                }

                upsertLink(editor, { url: link.url, skipValidation: true });
                setLink({ status: 'closed' });
              }}
            >
              <label htmlFor="review-link">Адрес ссылки</label>
              <Input
                id="review-link"
                value={link.url}
                aria-invalid={Boolean(link.error)}
                aria-describedby={link.error ? 'review-link-error' : undefined}
                onChange={(event) =>
                  setLink({ ...link, url: event.target.value, error: null })
                }
              />
              {link.error && (
                <p id="review-link-error" role="alert">
                  {link.error}
                </p>
              )}
              <Button type="submit">Вставить</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
