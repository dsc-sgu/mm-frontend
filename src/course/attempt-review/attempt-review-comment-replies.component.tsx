import { Check, MessageSquare, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import {
  getAttemptReviewCancelShortcutKeys,
  getAttemptReviewSubmitShortcutKeys,
} from './attempt-review-keyboard-shortcut.model';
import { RichTextEditor } from './rich-text-editor.component';
import { AttemptReviewCommentReplyItem } from './attempt-review-comment-reply-item.component';
import type { AttemptReviewLineCommentReply } from './attempt-review.types';

interface AttemptReviewCommentRepliesProps {
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
}

export function AttemptReviewCommentReplies({
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
}: AttemptReviewCommentRepliesProps) {
  const submitShortcutKeys = getAttemptReviewSubmitShortcutKeys();
  const cancelShortcutKeys = getAttemptReviewCancelShortcutKeys();

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
              onClick={onCancelReply}
            >
              <X className="size-4" />
              Отмена
              <KbdGroup className="ml-1 hidden sm:inline-flex">
                {cancelShortcutKeys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
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
