import { useState } from 'react';
import {
  Check,
  MessageSquare,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { RichTextContent, RichTextEditor } from './rich-text-editor.component';
import type {
  AttemptReviewCommentSide,
  AttemptReviewLineComment,
  AttemptReviewLineCommentReply,
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
  onReplySubmit,
  onReplyUpdate,
  onReplyDelete,
}: AttemptReviewLineCommentCardProps) {
  const isEditableComment =
    mode === 'editable' &&
    (comment.status === 'draft' || comment.isEditing === true);
  const [draftHtml, setDraftHtml] = useState(comment.html);
  const [isReplying, setIsReplying] = useState(false);
  const [replyHtml, setReplyHtml] = useState('<p></p>');
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const isSubmitDisabled = isRichTextHtmlEmpty(draftHtml);
  const isReplySubmitDisabled =
    isReplySubmitting || isRichTextHtmlEmpty(replyHtml);

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
    <div className="m-3 rounded-xl border bg-card p-3 font-sans shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground">
        <div className="min-w-0">
          <span className="block truncate font-medium text-foreground">
            {comment.authorName}
          </span>
          <span>{formatCommentRange(comment)}</span>
        </div>

        {!isEditableComment ? (
          <div className="flex shrink-0 items-center gap-1">
            {canEdit ? (
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
            {canDelete ? (
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

      {comment.status !== 'draft' ? (
        <CommentReplies
          replies={comment.replies ?? []}
          canReply={canReply && !isEditableComment}
          currentUsername={currentUsername}
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

function CommentReplies({
  replies,
  canReply,
  currentUsername,
  isReplying,
  replyHtml,
  isReplySubmitDisabled,
  onReplyHtmlChange,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onReplyUpdate,
  onReplyDelete,
}: {
  replies: AttemptReviewLineCommentReply[];
  canReply: boolean;
  currentUsername?: string;
  isReplying: boolean;
  replyHtml: string;
  isReplySubmitDisabled: boolean;
  onReplyHtmlChange: (html: string) => void;
  onStartReply: () => void;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  onReplyUpdate: (replyId: string, html: string) => void | Promise<void>;
  onReplyDelete: (replyId: string) => void | Promise<void>;
}) {
  if (replies.length === 0 && !canReply && !isReplying) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-3 border-t pt-3">
      {replies.length > 0 ? (
        <div className="grid gap-2">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              canManage={currentUsername === reply.authorUsername}
              onUpdate={onReplyUpdate}
              onDelete={onReplyDelete}
            />
          ))}
        </div>
      ) : null}

      {isReplying ? (
        <div className="grid gap-2 border-l-2 border-primary/30 pl-3">
          <RichTextEditor
            value={replyHtml}
            editable
            minHeightClassName="min-h-16"
            placeholder="Ответить на комментарий…"
            onChange={onReplyHtmlChange}
          />
          <div className="flex flex-wrap justify-start gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              disabled={isReplySubmitDisabled}
              onClick={onSubmitReply}
            >
              <Check className="size-4" />
              Отправить
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={onCancelReply}
            >
              <X className="size-4" />
              Отмена
            </Button>
          </div>
        </div>
      ) : canReply ? (
        <div className="flex justify-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground"
            onClick={onStartReply}
          >
            <MessageSquare className="size-4" />
            Ответить
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ReplyItem({
  reply,
  canManage,
  onUpdate,
  onDelete,
}: {
  reply: AttemptReviewLineCommentReply;
  canManage: boolean;
  onUpdate: (replyId: string, html: string) => void | Promise<void>;
  onDelete: (replyId: string) => void | Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftHtml, setDraftHtml] = useState(reply.html);
  const [isPending, setIsPending] = useState(false);
  const isSubmitDisabled = isPending || isRichTextHtmlEmpty(draftHtml);

  async function submitEdit() {
    if (isSubmitDisabled) {
      return;
    }

    setIsPending(true);

    try {
      await onUpdate(reply.id, draftHtml);
      setIsEditing(false);
    } finally {
      setIsPending(false);
    }
  }

  async function deleteReply() {
    setIsPending(true);

    try {
      await onDelete(reply.id);
    } finally {
      setIsPending(false);
    }
  }

  if (isEditing) {
    return (
      <div className="grid gap-2 border-l-2 border-muted pl-3 text-sm">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {reply.authorName}
          </span>
        </div>
        <RichTextEditor
          value={draftHtml}
          editable
          minHeightClassName="min-h-16"
          placeholder="Ответить на комментарий…"
          onChange={setDraftHtml}
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
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={isPending}
            onClick={() => {
              setDraftHtml(reply.html);
              setIsEditing(false);
            }}
          >
            <RotateCcw className="size-4" />
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-muted pl-3 text-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{reply.authorName}</span>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={isPending}
              aria-label="Редактировать ответ"
              title="Редактировать ответ"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={isPending}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
      <RichTextContent html={reply.html} />
    </div>
  );
}

function isRichTextHtmlEmpty(html: string): boolean {
  const withoutTags = html
    .replace(/<br\s*\/?>(?=<\/p>)/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, '')
    .trim();

  return withoutTags.length === 0 && !/<img\s/i.test(html);
}

function formatCommentRange(comment: AttemptReviewLineComment): string {
  const startLabel = sideLabel(comment.side).toLowerCase();
  const endSide = comment.endSide ?? comment.side;
  const endLineNumber = comment.endLineNumber ?? comment.lineNumber;

  if (comment.side === endSide && comment.lineNumber === endLineNumber) {
    return `К ${startLabel} #${comment.lineNumber}`;
  }

  if (comment.side === endSide) {
    const from = Math.min(comment.lineNumber, endLineNumber);
    const to = Math.max(comment.lineNumber, endLineNumber);
    return `К ${pluralSideLabel(comment.side).toLowerCase()} #${from}–${to}`;
  }

  return `К ${startLabel} #${comment.lineNumber} → ${sideLabel(endSide).toLowerCase()} #${endLineNumber}`;
}

function sideLabel(side: AttemptReviewCommentSide): string {
  return side === 'additions' ? 'новой строке' : 'старой строке';
}

function pluralSideLabel(side: AttemptReviewCommentSide): string {
  return side === 'additions' ? 'новым строкам' : 'старым строкам';
}
