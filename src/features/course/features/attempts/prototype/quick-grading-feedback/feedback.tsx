// PROTOTYPE (#121): the chosen Overall Feedback affordance — an inline field
// in the quick-grading row (variant B).
import type { KeyboardEvent } from 'react';
import { MessageSquareText } from 'lucide-react';

import { Input } from '@/shadcn/components/ui/input';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import type { RowLayout } from '@/features/course/features/attempts/prototype/quick-grading-feedback/row';

export type FeedbackCellProps = {
  layout: RowLayout;
  attempt: CourseAttempt;
  feedback: string;
  editable: boolean;
  onFeedbackChange: (value: string) => void;
  onCommitNext: () => void;
};

export function InlineFeedbackCell({
  attempt,
  feedback,
  editable,
  onFeedbackChange,
  onCommitNext,
  inputRef,
  onFocus,
}: FeedbackCellProps & {
  inputRef: (element: HTMLInputElement | null) => void;
  onFocus: () => void;
}) {
  if (!editable) {
    return feedback.trim() ? <ReadonlyFeedback feedback={feedback} /> : null;
  }

  return (
    <Input
      ref={inputRef}
      value={feedback}
      title={feedback || undefined}
      placeholder="необязательно"
      aria-label={`Общий отзыв: ${attempt.student.fullName}`}
      onFocus={onFocus}
      onChange={(event) => onFeedbackChange(event.target.value)}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onCommitNext();
        }
      }}
      className="h-9"
    />
  );
}

// ── read-only preview for saved or locked rows ──────────────────────────────

function ReadonlyFeedback({ feedback }: { feedback: string }) {
  return (
    <span
      title={feedback}
      className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
    >
      <MessageSquareText className="size-3.5 shrink-0 text-primary" />
      <span className="truncate">{feedback}</span>
    </span>
  );
}
