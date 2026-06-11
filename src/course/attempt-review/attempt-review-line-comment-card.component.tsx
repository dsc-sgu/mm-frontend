import { useState } from 'react';
import { Check, Pencil, RotateCcw, Trash2, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { RichTextContent, RichTextEditor } from './rich-text-editor.component';
import type {
  AttemptReviewCommentSide,
  AttemptReviewLineComment,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewLineCommentCardProps {
  comment: AttemptReviewLineComment;
  mode: AttemptReviewMode;
  canDelete: boolean;
  canEdit: boolean;
  onSubmit: (html: string) => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AttemptReviewLineCommentCard({
  comment,
  mode,
  canDelete,
  canEdit,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
}: AttemptReviewLineCommentCardProps) {
  const isEditableComment =
    mode === 'editable' &&
    (comment.status === 'draft' || comment.isEditing === true);
  const [draftHtml, setDraftHtml] = useState(comment.html);
  const isSubmitDisabled = isRichTextHtmlEmpty(draftHtml);

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
          <div className="flex flex-wrap justify-end gap-2">
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
          </div>
        </div>
      ) : (
        <RichTextContent html={comment.html} />
      )}
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
