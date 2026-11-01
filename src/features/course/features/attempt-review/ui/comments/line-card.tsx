import { areReviewTextsEqual } from '@/features/course/features/review/model/text-document';
import type { ReviewTextDocument } from '@/features/course/features/review/model/text-document';
import type { UserId } from '@/features/auth/model/identity';
import { formatFullName } from '@/features/auth/model/full-name';
import { useState } from 'react';
import { Check, Pencil, RotateCcw, Trash2, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import { cn } from '@/shadcn/lib/utils';
import {
  getLineCommentStatus,
  isEditableLineComment,
  isPendingLineComment,
} from '@/features/course/features/attempt-review/model/comment-lifecycle';
import { formatAttemptReviewCommentRange } from '@/features/course/features/attempt-review/model/comment-range';
import { getShortcutLabels } from '@/features/keyboard/shortcut';
import {
  commentCancelShortcut,
  commentSubmitShortcut,
} from '@/features/course/features/attempt-review/model/shortcuts';
import { AttemptReviewCommentPendingNotice } from './pending-notice';
import { AttemptReviewCommentReplies } from './replies';
import { AttemptReviewCommentTimestamp } from './timestamp';
import {
  RichTextContent,
  RichTextEditor,
} from '@/features/course/features/attempt-review/ui/rich-text/editor';
import { isRichTextEmpty } from '@/features/course/features/attempt-review/ui/rich-text/empty';
import { useUnsentCommentText } from '@/features/course/features/attempt-review/hooks/use-unsent-comment-text';
import { unsentCommentTextKeys } from '@/features/course/features/attempt-review/model/unsent-comment-text';
import type {
  AttemptReviewLineComment,
  AttemptReviewMode,
} from '@/features/course/features/attempt-review/model/types';

type AttemptReviewLineCommentCardProps = {
  comment: AttemptReviewLineComment;
  mode: AttemptReviewMode;
  canDelete: boolean;
  canEdit: boolean;
  canReply: boolean;
  currentUserId?: UserId;
  onSubmit: (text: ReviewTextDocument | null) => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRevertPending: () => void;
  onReplySubmit: (text: ReviewTextDocument | null) => void | Promise<void>;
  onReplyUpdate: (
    replyId: string,
    text: ReviewTextDocument | null
  ) => void | Promise<void>;
  onReplyDelete: (replyId: string) => void | Promise<void>;
};

type ReplyComposerState =
  | { status: 'idle' }
  | { status: 'editing'; text: ReviewTextDocument | null }
  | { status: 'submitting'; text: ReviewTextDocument | null };

const EMPTY_REPLY_TEXT = { version: 1 as const, children: [] };

export function AttemptReviewLineCommentCard({
  comment,
  mode,
  canDelete,
  canEdit,
  canReply,
  currentUserId,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
  onRevertPending,
  onReplySubmit,
  onReplyUpdate,
  onReplyDelete,
}: AttemptReviewLineCommentCardProps) {
  const commentStatus = getLineCommentStatus(comment);
  const isPendingUpdate = commentStatus === 'pending-update';
  const isPendingDelete = commentStatus === 'pending-delete';
  const isPendingComment = isPendingLineComment(comment);
  const isEditableComment = isEditableLineComment({ comment, mode });
  const unsentTextStore = useUnsentCommentText();
  const commentTextKey = unsentCommentTextKeys.comment(comment.id);
  const replyTextKey = unsentCommentTextKeys.reply(comment.id);
  const [draftState, setDraftState] = useState(() => {
    const unsent = unsentTextStore.read(commentTextKey, comment.text);
    return {
      sourceText: comment.text,
      text: unsent === undefined ? comment.text : unsent,
    };
  });
  const [replyComposer, setReplyComposer] = useState<ReplyComposerState>(() => {
    const text = unsentTextStore.read(replyTextKey, EMPTY_REPLY_TEXT);

    return text === undefined
      ? { status: 'idle' }
      : { status: 'editing', text };
  });
  const draftText = areReviewTextsEqual(draftState.sourceText, comment.text)
    ? draftState.text
    : comment.text;
  const isSubmitDisabled = isRichTextEmpty(draftText);
  const isReplying = replyComposer.status !== 'idle';
  const isReplySubmitting = replyComposer.status === 'submitting';
  const replyText = isReplying ? replyComposer.text : EMPTY_REPLY_TEXT;
  const isReplySubmitDisabled = isReplySubmitting || isRichTextEmpty(replyText);
  const submitShortcutLabels = getShortcutLabels(commentSubmitShortcut);
  const cancelShortcutLabels = getShortcutLabels(commentCancelShortcut);

  function changeDraftText(text: ReviewTextDocument | null) {
    setDraftState({ sourceText: comment.text, text });
    unsentTextStore.write(commentTextKey, { sourceText: comment.text, text });
  }

  function submitComment(text: ReviewTextDocument | null) {
    unsentTextStore.clear(commentTextKey);
    onSubmit(text);
  }

  function cancelComment() {
    unsentTextStore.clear(commentTextKey);
    onCancel();
  }

  function editComment() {
    // A new edit starts from the saved text, not from an abandoned one.
    unsentTextStore.clear(commentTextKey);
    onEdit();
  }

  async function submitReply() {
    if (
      replyComposer.status !== 'editing' ||
      isRichTextEmpty(replyComposer.text)
    ) {
      return;
    }

    const submittedText = replyComposer.text;
    setReplyComposer({ status: 'submitting', text: submittedText });
    // Cleared before the request: a card remounted while it is in flight
    // must not reopen the composer with text that is already being sent.
    unsentTextStore.clear(replyTextKey);

    try {
      await onReplySubmit(submittedText);
      setReplyComposer({ status: 'idle' });
    } catch (error) {
      unsentTextStore.write(replyTextKey, {
        sourceText: EMPTY_REPLY_TEXT,
        text: submittedText,
      });
      setReplyComposer({ status: 'editing', text: submittedText });
      throw error;
    }
  }

  function changeReplyText(text: ReviewTextDocument | null) {
    setReplyComposer((current) => {
      if (current.status !== 'editing') {
        return current;
      }

      return { status: 'editing', text };
    });
    unsentTextStore.write(replyTextKey, { sourceText: EMPTY_REPLY_TEXT, text });
  }

  function startReply() {
    unsentTextStore.clear(replyTextKey);
    setReplyComposer({ status: 'editing', text: EMPTY_REPLY_TEXT });
  }

  function cancelReply() {
    if (replyComposer.status === 'submitting') {
      return;
    }

    unsentTextStore.clear(replyTextKey);
    setReplyComposer({ status: 'idle' });
  }

  return (
    <div
      className={cn(
        'm-3 rounded-xl border bg-card p-3 font-sans shadow-sm',
        isPendingDelete && 'bg-muted/40 opacity-70'
      )}
    >
      <div
        className={cn(
          'mb-2 flex flex-wrap items-start justify-between gap-2 text-xs',
          'text-muted-foreground'
        )}
      >
        <div className="min-w-0">
          <div
            className={cn(
              'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5'
            )}
          >
            <span className="truncate font-medium text-foreground">
              {formatFullName(comment.author)}
            </span>
            {commentStatus === 'saved' ? (
              <>
                <span aria-hidden="true">·</span>
                <AttemptReviewCommentTimestamp
                  createdAt={comment.createdAt}
                  updatedAt={comment.updatedAt}
                />
              </>
            ) : null}
            {isPendingComment ? (
              <>
                <span aria-hidden="true">·</span>
                <AttemptReviewCommentPendingNotice status={commentStatus} />
              </>
            ) : null}
          </div>
          <span>{formatAttemptReviewCommentRange(comment)}</span>
        </div>

        {!isEditableComment ? (
          <div className="flex shrink-0 items-center gap-1">
            {isPendingDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-lg px-2 text-xs"
                onClick={onRevertPending}
              >
                <RotateCcw className="size-3.5" />
                Отменить удаление
              </Button>
            ) : null}
            {!isPendingDelete && canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Редактировать комментарий"
                title="Редактировать комментарий"
                onClick={editComment}
              >
                <Pencil className="size-3.5" />
              </Button>
            ) : null}
            {isPendingUpdate ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Отменить изменения комментария"
                title="Отменить изменения"
                onClick={onRevertPending}
              >
                <RotateCcw className="size-3.5" />
              </Button>
            ) : null}
            {!isPendingDelete && canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className={cn(
                  'text-muted-foreground hover:bg-destructive/10',
                  'hover:text-destructive'
                )}
                aria-label="Удалить комментарий"
                title="Удалить комментарий"
                onClick={onDelete}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isEditableComment ? (
        <div className="grid gap-2">
          <RichTextEditor
            value={draftText}
            editable
            autoFocus
            minHeightClassName="min-h-20"
            placeholder="Комментарий к строке…"
            onChange={changeDraftText}
            onSubmitShortcut={() => {
              if (!isSubmitDisabled) {
                submitComment(draftText);
              }
            }}
            onCancelShortcut={cancelComment}
          />
          <div className="flex flex-wrap justify-start gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              disabled={isSubmitDisabled}
              onClick={() => submitComment(draftText)}
            >
              <Check className="size-4" />
              Отправить
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
              onClick={cancelComment}
            >
              {comment.status === 'draft' ? (
                <X className="size-4" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              Отмена
              <KbdGroup className="ml-1 hidden sm:inline-flex">
                {cancelShortcutLabels.map((label) => (
                  <Kbd key={label}>{label}</Kbd>
                ))}
              </KbdGroup>
            </Button>
          </div>
        </div>
      ) : (
        <RichTextContent text={comment.text} />
      )}

      {commentStatus !== 'draft' ? (
        <AttemptReviewCommentReplies
          replies={comment.replies ?? []}
          canReply={canReply && !isEditableComment && !isPendingComment}
          currentUserId={isPendingComment ? undefined : currentUserId}
          isReplying={isReplying}
          replyText={replyText}
          isReplySubmitDisabled={isReplySubmitDisabled}
          onReplyTextChange={changeReplyText}
          onStartReply={startReply}
          onCancelReply={cancelReply}
          onSubmitReply={() => {
            void submitReply();
          }}
          onReplyUpdate={onReplyUpdate}
          onReplyDelete={onReplyDelete}
        />
      ) : null}
    </div>
  );
}
