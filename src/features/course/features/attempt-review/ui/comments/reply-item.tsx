import { useEffect, useState } from 'react';
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import {
  getAttemptReviewCancelShortcutKeys,
  getAttemptReviewSubmitShortcutKeys,
} from '@/features/course/features/attempt-review/model/keyboard-shortcuts';
import {
  RichTextContent,
  RichTextEditor,
} from '@/features/course/features/attempt-review/ui/rich-text/editor';
import { isRichTextHtmlEmpty } from '@/features/course/features/attempt-review/ui/rich-text/empty';
import { AttemptReviewCommentTimestamp } from './timestamp';
import type { AttemptReviewLineCommentReply } from '@/features/course/features/attempt-review/model/types';

type AttemptReviewCommentReplyItemProps = {
  reply: AttemptReviewLineCommentReply;
  canManage: boolean;
  onUpdate: (replyId: string, html: string) => void | Promise<void>;
  onDelete: (replyId: string) => void | Promise<void>;
};

export function AttemptReviewCommentReplyItem({
  reply,
  canManage,
  onUpdate,
  onDelete,
}: AttemptReviewCommentReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftHtml, setDraftHtml] = useState(reply.html);
  const [isPending, setIsPending] = useState(false);
  const isSubmitDisabled = isPending || isRichTextHtmlEmpty(draftHtml);
  const submitShortcutKeys = getAttemptReviewSubmitShortcutKeys();
  const cancelShortcutKeys = getAttemptReviewCancelShortcutKeys();

  useEffect(() => {
    if (!isEditing) {
      setDraftHtml(reply.html);
    }
  }, [isEditing, reply.html]);

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

  function cancelEdit() {
    if (isPending) {
      return;
    }

    setDraftHtml(reply.html);
    setIsEditing(false);
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
        <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {reply.authorName}
          </span>
          <span aria-hidden="true">·</span>
          <AttemptReviewCommentTimestamp
            createdAt={reply.createdAt}
            updatedAt={reply.updatedAt}
          />
        </div>
        <RichTextEditor
          value={draftHtml}
          editable
          autoFocus
          minHeightClassName="min-h-16"
          placeholder="Ответить на комментарий…"
          onChange={setDraftHtml}
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
            disabled={isPending}
            onClick={cancelEdit}
          >
            <RotateCcw className="size-4" />
            Отмена
            <KbdGroup className="ml-1 hidden sm:inline-flex">
              {cancelShortcutKeys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </KbdGroup>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-muted pl-3 text-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="font-medium text-foreground">
            {reply.authorName}
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
