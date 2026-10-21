import type { UserId } from '@/features/auth/model/identity';
import { Check, MessageSquare, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import { getShortcutLabels } from '@/features/keyboard/shortcut';
import {
  commentCancelShortcut,
  commentSubmitShortcut,
} from '@/features/course/features/attempt-review/model/shortcuts';
import { RichTextEditor } from '@/features/course/features/attempt-review/ui/rich-text/editor';
import { AttemptReviewCommentReplyItem } from './reply-item';
import type { ReviewReply } from '@/features/course/features/review/model/types';

type AttemptReviewCommentRepliesProps = {
  replies: ReviewReply[];
  canReply: boolean;
  currentUserId?: UserId;
  isReplying: boolean;
  replyHtml: string;
  isReplySubmitDisabled: boolean;
  onReplyHtmlChange: (html: string) => void;
  onStartReply: () => void;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  onReplyUpdate: (replyId: string, html: string) => void | Promise<void>;
  onReplyDelete: (replyId: string) => void | Promise<void>;
};

export function AttemptReviewCommentReplies({
  replies,
  canReply,
  currentUserId,
  isReplying,
  replyHtml,
  isReplySubmitDisabled,
  onReplyHtmlChange,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onReplyUpdate,
  onReplyDelete,
}: AttemptReviewCommentRepliesProps) {
  const submitShortcutLabels = getShortcutLabels(commentSubmitShortcut);
  const cancelShortcutLabels = getShortcutLabels(commentCancelShortcut);

  if (replies.length === 0 && !canReply && !isReplying) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-3 border-t pt-3">
      {replies.length > 0 ? (
        <div className="grid gap-2">
          {replies.map((reply) => (
            <AttemptReviewCommentReplyItem
              key={reply.id}
              reply={reply}
              canManage={currentUserId === reply.author.id}
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
            autoFocus
            minHeightClassName="min-h-16"
            placeholder="Ответить на комментарий…"
            onChange={onReplyHtmlChange}
            onSubmitShortcut={() => {
              if (!isReplySubmitDisabled) {
                onSubmitReply();
              }
            }}
            onCancelShortcut={onCancelReply}
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
              onClick={onCancelReply}
            >
              <X className="size-4" />
              Отмена
              <KbdGroup className="ml-1 hidden sm:inline-flex">
                {cancelShortcutLabels.map((label) => (
                  <Kbd key={label}>{label}</Kbd>
                ))}
              </KbdGroup>
            </Button>
          </div>
        </div>
      ) : null}

      {!isReplying && canReply ? (
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
