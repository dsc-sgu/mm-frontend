import { Trash2 } from 'lucide-react';

import { RichTextEditor } from './rich-text-editor.component';
import type {
  AttemptReviewCommentSide,
  AttemptReviewLineComment,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewLineCommentCardProps {
  comment: AttemptReviewLineComment;
  mode: AttemptReviewMode;
  onChange: (html: string) => void;
  onDelete: () => void;
}

export function AttemptReviewLineCommentCard({
  comment,
  mode,
  onChange,
  onDelete,
}: AttemptReviewLineCommentCardProps) {
  return (
    <div className="m-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {comment.authorName}
        </span>
        <div className="flex items-center gap-2">
          <span>{formatCommentRange(comment)}</span>
          {mode === 'editable' ? (
            <button
              type="button"
              className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Удалить комментарий"
              title="Удалить комментарий"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <RichTextEditor
        value={comment.html}
        editable={mode === 'editable'}
        minHeightClassName="min-h-20"
        placeholder="Комментарий к строке…"
        onChange={onChange}
      />
    </div>
  );
}

function formatCommentRange(comment: AttemptReviewLineComment): string {
  const startLabel = sideLabel(comment.side);
  const endSide = comment.endSide ?? comment.side;
  const endLineNumber = comment.endLineNumber ?? comment.lineNumber;

  if (comment.side === endSide && comment.lineNumber === endLineNumber) {
    return `${startLabel} #${comment.lineNumber}`;
  }

  if (comment.side === endSide) {
    const from = Math.min(comment.lineNumber, endLineNumber);
    const to = Math.max(comment.lineNumber, endLineNumber);
    return `${pluralSideLabel(comment.side)} #${from}–${to}`;
  }

  return `${startLabel} #${comment.lineNumber} → ${sideLabel(endSide)} #${endLineNumber}`;
}

function sideLabel(side: AttemptReviewCommentSide): string {
  return side === 'additions' ? 'Новая строка' : 'Старая строка';
}

function pluralSideLabel(side: AttemptReviewCommentSide): string {
  return side === 'additions' ? 'Новые строки' : 'Старые строки';
}
