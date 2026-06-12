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
import {
  getAttemptReviewCancelShortcutKeys,
  getAttemptReviewSubmitShortcutKeys,
} from '@/features/course/features/attempt-review/model/keyboard-shortcuts';
import { AttemptReviewCommentPendingNotice } from './pending-notice';
import { AttemptReviewCommentReplies } from './replies';
import { AttemptReviewCommentTimestamp } from './timestamp';
import {
  RichTextContent,
  RichTextEditor,
} from '@/features/course/features/attempt-review/ui/rich-text/editor';
import { isRichTextHtmlEmpty } from '@/features/course/features/attempt-review/ui/rich-text/empty';
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
  currentUsername?: string;
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
  currentUsername,
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
  const [draftState, setDraftState] = useState(() => ({
    sourceHtml: comment.html,
    html: comment.html,
  }));
  const [replyComposer, setReplyComposer] = useState<ReplyComposerState>({
    status: 'idle',
  });
  const draftHtml =
    draftState.sourceHtml === comment.html ? draftState.html : comment.html;
  const isSubmitDisabled = isRichTextHtmlEmpty(draftHtml);
  const isReplying = replyComposer.status !== 'idle';
  const isReplySubmitting = replyComposer.status === 'submitting';
  const replyHtml = isReplying ? replyComposer.html : EMPTY_REPLY_HTML;
  const isReplySubmitDisabled =
    isReplySubmitting || isRichTextHtmlEmpty(replyHtml);
  const submitShortcutKeys = getAttemptReviewSubmitShortcutKeys();
  const cancelShortcutKeys = getAttemptReviewCancelShortcutKeys();

  function changeDraftHtml(html: string) {
    setDraftState({ sourceHtml: comment.html, html });
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

    try {
      await onReplySubmit(submittedHtml);
      setReplyComposer({ status: 'idle' });
    } catch (error) {
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
  }

  function startReply() {
    setReplyComposer({ status: 'editing', html: EMPTY_REPLY_HTML });
  }

  function cancelReply() {
    setReplyComposer((current) =>
      current.status === 'submitting' ? current : { status: 'idle' }
    );
  }

  return (
    <div
      className={cn(
        'm-3 rounded-xl border bg-card p-3 font-sans shadow-sm',
        isPendingDelete && 'bg-muted/40 opacity-70'
      )}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="truncate font-medium text-foreground">
              {comment.authorName}
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
                onClick={onEdit}
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
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                onSubmit(draftHtml);
              }
            }}
            onCancelShortcut={onCancel}
          />
          <div className="flex flex-wrap justify-start gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              disabled={isSubmitDisabled}
              onClick={() => onSubmit(draftHtml)}
            >
              <Check className="size-4" />
              Отправить
              <KbdGroup className="ml-1 hidden sm:inline-flex">
                {submitShortcutKeys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={onCancel}
            >
              {comment.status === 'draft' ? (
                <X className="size-4" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              Отмена
              <KbdGroup className="ml-1 hidden sm:inline-flex">
                {cancelShortcutKeys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
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
          currentUsername={isPendingComment ? undefined : currentUsername}
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
