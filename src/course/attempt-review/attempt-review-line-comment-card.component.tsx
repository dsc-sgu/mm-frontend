import { useEffect, useState } from 'react';
import { Check, Pencil, RotateCcw, Trash2, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { formatAttemptReviewCommentRange } from './attempt-review-comment-range.format';
import { AttemptReviewCommentPendingNotice } from './attempt-review-comment-pending-notice.component';
import { AttemptReviewCommentReplies } from './attempt-review-comment-replies.component';
import { AttemptReviewCommentTimestamp } from './attempt-review-comment-timestamp.component';
import { RichTextContent, RichTextEditor } from './rich-text-editor.component';
import { isRichTextHtmlEmpty } from './rich-text-empty.model';
import type {
  AttemptReviewLineComment,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewLineCommentCardProps {
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
}

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
  const commentStatus = comment.status ?? 'saved';
  const isPendingCreate = commentStatus === 'pending-create';
  const isPendingUpdate = commentStatus === 'pending-update';
  const isPendingDelete = commentStatus === 'pending-delete';
  const isPendingComment =
    isPendingCreate || isPendingUpdate || isPendingDelete;
  const isEditableComment =
    mode === 'editable' &&
    (commentStatus === 'draft' || comment.isEditing === true);
  const [draftHtml, setDraftHtml] = useState(comment.html);
  const [isReplying, setIsReplying] = useState(false);
  const [replyHtml, setReplyHtml] = useState('<p></p>');
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const isSubmitDisabled = isRichTextHtmlEmpty(draftHtml);
  const isReplySubmitDisabled =
    isReplySubmitting || isRichTextHtmlEmpty(replyHtml);

  useEffect(() => {
    if (!isEditableComment) {
      setDraftHtml(comment.html);
    }
  }, [comment.html, isEditableComment]);

  async function submitReply() {
    if (isReplySubmitDisabled) {
      return;
    }

    setIsReplySubmitting(true);

    try {
      await onReplySubmit(replyHtml);
      setReplyHtml('<p></p>');
      setIsReplying(false);
    } finally {
      setIsReplySubmitting(false);
    }
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
            {isPendingComment ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-lg px-2 text-xs"
                onClick={onRevertPending}
              >
                <RotateCcw className="size-3.5" />
                {isPendingDelete ? 'Отменить удаление' : 'Отменить'}
              </Button>
            ) : null}
            {!isPendingComment && canEdit ? (
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
            {!isPendingComment && canDelete ? (
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
            minHeightClassName="min-h-20"
            placeholder="Комментарий к строке…"
            onChange={setDraftHtml}
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
          onReplyHtmlChange={setReplyHtml}
          onStartReply={() => setIsReplying(true)}
          onCancelReply={() => {
            setReplyHtml('<p></p>');
            setIsReplying(false);
          }}
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
