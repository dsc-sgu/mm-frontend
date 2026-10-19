import type { UserId } from '@/features/auth/model/identity';
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
import { isRichTextHtmlEmpty } from '@/features/course/features/attempt-review/ui/rich-text/empty';
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
  onSubmit: (html: string) => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRevertPending: () => void;
  onReplySubmit: (html: string) => void | Promise<void>;
  onReplyUpdate: (replyId: string, html: string) => void | Promise<void>;
  onReplyDelete: (replyId: string) => void | Promise<void>;
};

type ReplyComposerState =
  | { status: 'idle' }
  | { status: 'editing'; html: string }
  | { status: 'submitting'; html: string };

const EMPTY_REPLY_HTML = '<p></p>';

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
  const [draftState, setDraftState] = useState(() => ({
    sourceHtml: comment.html,
    html: unsentTextStore.read(commentTextKey, comment.html) ?? comment.html,
  }));
  const [replyComposer, setReplyComposer] = useState<ReplyComposerState>(() => {
    const html = unsentTextStore.read(replyTextKey, EMPTY_REPLY_HTML);

    return html === undefined
      ? { status: 'idle' }
      : { status: 'editing', html };
  });
  const draftHtml =
    draftState.sourceHtml === comment.html ? draftState.html : comment.html;
  const isSubmitDisabled = isRichTextHtmlEmpty(draftHtml);
  const isReplying = replyComposer.status !== 'idle';
  const isReplySubmitting = replyComposer.status === 'submitting';
  const replyHtml = isReplying ? replyComposer.html : EMPTY_REPLY_HTML;
  const isReplySubmitDisabled =
    isReplySubmitting || isRichTextHtmlEmpty(replyHtml);
  const submitShortcutLabels = getShortcutLabels(commentSubmitShortcut);
  const cancelShortcutLabels = getShortcutLabels(commentCancelShortcut);

  function changeDraftHtml(html: string) {
    setDraftState({ sourceHtml: comment.html, html });
    unsentTextStore.write(commentTextKey, { sourceHtml: comment.html, html });
  }

  function submitComment(html: string) {
    unsentTextStore.clear(commentTextKey);
    onSubmit(html);
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
      isRichTextHtmlEmpty(replyComposer.html)
    ) {
      return;
    }

    const submittedHtml = replyComposer.html;
    setReplyComposer({ status: 'submitting', html: submittedHtml });
    // Cleared before the request: a card remounted while it is in flight
    // must not reopen the composer with text that is already being sent.
    unsentTextStore.clear(replyTextKey);

    try {
      await onReplySubmit(submittedHtml);
      setReplyComposer({ status: 'idle' });
    } catch (error) {
      unsentTextStore.write(replyTextKey, {
        sourceHtml: EMPTY_REPLY_HTML,
        html: submittedHtml,
      });
      setReplyComposer({ status: 'editing', html: submittedHtml });
      throw error;
    }
  }

  function changeReplyHtml(html: string) {
    setReplyComposer((current) => {
      if (current.status !== 'editing') {
        return current;
      }

      return { status: 'editing', html };
    });
    unsentTextStore.write(replyTextKey, { sourceHtml: EMPTY_REPLY_HTML, html });
  }

  function startReply() {
    unsentTextStore.clear(replyTextKey);
    setReplyComposer({ status: 'editing', html: EMPTY_REPLY_HTML });
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
              {comment.author.name}
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
            value={draftHtml}
            editable
            autoFocus
            minHeightClassName="min-h-20"
            placeholder="Комментарий к строке…"
            onChange={changeDraftHtml}
            onSubmitShortcut={() => {
              if (!isSubmitDisabled) {
                submitComment(draftHtml);
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
              onClick={() => submitComment(draftHtml)}
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
        <RichTextContent html={comment.html} />
      )}

      {commentStatus !== 'draft' ? (
        <AttemptReviewCommentReplies
          replies={comment.replies ?? []}
          canReply={canReply && !isEditableComment && !isPendingComment}
          currentUserId={isPendingComment ? undefined : currentUserId}
          isReplying={isReplying}
          replyHtml={replyHtml}
          isReplySubmitDisabled={isReplySubmitDisabled}
          onReplyHtmlChange={changeReplyHtml}
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
