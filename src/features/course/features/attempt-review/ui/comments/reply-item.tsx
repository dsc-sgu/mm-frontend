import { areReviewTextsEqual } from '@/features/course/features/review/model/text-document';
import type { ReviewTextDocument } from '@/features/course/features/review/model/text-document';
import { useState } from 'react';
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { formatFullName } from '@/features/auth/model/full-name';
import { Button } from '@/shadcn/components/ui/button';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import { getShortcutLabels } from '@/features/keyboard/shortcut';
import {
  commentCancelShortcut,
  commentSubmitShortcut,
} from '@/features/course/features/attempt-review/model/shortcuts';
import {
  RichTextContent,
  RichTextEditor,
} from '@/features/course/features/attempt-review/ui/rich-text/editor';
import { isRichTextEmpty } from '@/features/course/features/attempt-review/ui/rich-text/empty';
import { useUnsentCommentText } from '@/features/course/features/attempt-review/hooks/use-unsent-comment-text';
import { unsentCommentTextKeys } from '@/features/course/features/attempt-review/model/unsent-comment-text';
import { AttemptReviewCommentTimestamp } from './timestamp';
import type { ReviewReply } from '@/features/course/features/review/model/types';
import { cn } from '@/shadcn/lib/utils';

type AttemptReviewCommentReplyItemProps = {
  reply: ReviewReply;
  canManage: boolean;
  onUpdate: (
    replyId: string,
    text: ReviewTextDocument | null
  ) => void | Promise<void>;
  onDelete: (replyId: string) => void | Promise<void>;
};

type ReplyItemState =
  | { mode: 'view'; pending: false }
  | { mode: 'view'; pending: 'delete' }
  | {
      mode: 'editing';
      draftText: ReviewTextDocument | null;
      sourceText: ReviewTextDocument | null;
      pending: false;
    }
  | {
      mode: 'editing';
      draftText: ReviewTextDocument | null;
      sourceText: ReviewTextDocument | null;
      pending: 'update';
    };

export function AttemptReviewCommentReplyItem({
  reply,
  canManage,
  onUpdate,
  onDelete,
}: AttemptReviewCommentReplyItemProps) {
  const unsentTextStore = useUnsentCommentText();
  const textKey = unsentCommentTextKeys.replyEdit(reply.id);
  const [state, setState] = useState<ReplyItemState>(() => {
    const unsentText = unsentTextStore.read(textKey, reply.text);

    return unsentText === undefined
      ? { mode: 'view', pending: false }
      : {
          mode: 'editing',
          draftText: unsentText,
          sourceText: reply.text,
          pending: false,
        };
  });
  const isEditing = state.mode === 'editing';
  const isPending = state.pending !== false;
  const draftText =
    state.mode === 'editing' &&
    areReviewTextsEqual(state.sourceText, reply.text)
      ? state.draftText
      : reply.text;
  const isSubmitDisabled = isPending || isRichTextEmpty(draftText);
  const submitShortcutLabels = getShortcutLabels(commentSubmitShortcut);
  const cancelShortcutLabels = getShortcutLabels(commentCancelShortcut);

  function startEdit() {
    unsentTextStore.clear(textKey);
    setState({
      mode: 'editing',
      draftText: reply.text,
      sourceText: reply.text,
      pending: false,
    });
  }

  function changeDraftText(nextDraftText: ReviewTextDocument | null) {
    setState((current) => {
      if (current.mode !== 'editing' || current.pending === 'update') {
        return current;
      }

      return {
        mode: 'editing',
        draftText: nextDraftText,
        sourceText: reply.text,
        pending: false,
      };
    });
    unsentTextStore.write(textKey, {
      sourceText: reply.text,
      text: nextDraftText,
    });
  }

  async function submitEdit() {
    if (state.mode !== 'editing' || isSubmitDisabled) {
      return;
    }

    const submittedText = draftText;
    setState({
      mode: 'editing',
      draftText: submittedText,
      sourceText: reply.text,
      pending: 'update',
    });
    // Cleared before the request: a card remounted while it is in flight
    // must not reopen the editor with text that is already being sent.
    unsentTextStore.clear(textKey);

    try {
      await onUpdate(reply.id, submittedText);
      setState({ mode: 'view', pending: false });
    } catch (error) {
      unsentTextStore.write(textKey, {
        sourceText: reply.text,
        text: submittedText,
      });
      setState({
        mode: 'editing',
        draftText: submittedText,
        sourceText: reply.text,
        pending: false,
      });
      throw error;
    }
  }

  function cancelEdit() {
    if (state.pending === 'update') {
      return;
    }

    unsentTextStore.clear(textKey);
    setState({ mode: 'view', pending: false });
  }

  async function deleteReply() {
    if (state.mode !== 'view' || state.pending === 'delete') {
      return;
    }

    setState({ mode: 'view', pending: 'delete' });

    try {
      await onDelete(reply.id);
    } finally {
      setState({ mode: 'view', pending: false });
    }
  }

  if (isEditing) {
    return (
      <div className="grid gap-2 border-l-2 border-muted pl-3 text-sm">
        <div
          className={cn(
            'mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs',
            'text-muted-foreground'
          )}
        >
          <span className="font-medium text-foreground">
            {formatFullName(reply.author)}
          </span>
          <span aria-hidden="true">·</span>
          <AttemptReviewCommentTimestamp
            createdAt={reply.createdAt}
            updatedAt={reply.updatedAt}
          />
        </div>
        <RichTextEditor
          value={draftText}
          editable
          autoFocus
          minHeightClassName="min-h-16"
          placeholder="Ответить на комментарий…"
          onChange={changeDraftText}
          onSubmitShortcut={() => {
            void submitEdit();
          }}
          onCancelShortcut={cancelEdit}
        />
        <div className="flex flex-wrap justify-start gap-2">
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={isSubmitDisabled}
            onClick={() => {
              void submitEdit();
            }}
          >
            <Check className="size-4" />
            Сохранить
            <KbdGroup className="ml-1 hidden sm:inline-flex">
              {submitShortcutLabels.map((label) => (
                <Kbd key={label}>{label}</Kbd>
              ))}
            </KbdGroup>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={isPending}
            onClick={cancelEdit}
          >
            <RotateCcw className="size-4" />
            Отмена
            <KbdGroup className="ml-1 hidden sm:inline-flex">
              {cancelShortcutLabels.map((label) => (
                <Kbd key={label}>{label}</Kbd>
              ))}
            </KbdGroup>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-muted pl-3 text-sm">
      <div
        className={cn(
          'mb-1 flex flex-wrap items-center justify-between gap-2 text-xs',
          'text-muted-foreground'
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="font-medium text-foreground">
            {formatFullName(reply.author)}
          </span>
          <span aria-hidden="true">·</span>
          <AttemptReviewCommentTimestamp
            createdAt={reply.createdAt}
            updatedAt={reply.updatedAt}
          />
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={isPending}
              aria-label="Редактировать ответ"
              title="Редактировать ответ"
              onClick={startEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={isPending}
              className={cn(
                'text-muted-foreground hover:bg-destructive/10',
                'hover:text-destructive'
              )}
              aria-label="Удалить ответ"
              title="Удалить ответ"
              onClick={() => {
                void deleteReply();
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
      <RichTextContent text={reply.text} />
    </div>
  );
}
