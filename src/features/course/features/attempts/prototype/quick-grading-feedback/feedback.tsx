// PROTOTYPE (#121): the variant-specific Overall Feedback affordances.
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { MessageSquarePlus, MessageSquareText } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shadcn/components/ui/drawer';
import { Input } from '@/shadcn/components/ui/input';
import { Kbd } from '@/shadcn/components/ui/kbd';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
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

// ── A: icon button → popover (desktop) / drawer (phone) ────────────────────

export function PopoverFeedbackCell({
  layout,
  attempt,
  feedback,
  editable,
  onFeedbackChange,
  onCommitNext,
}: FeedbackCellProps) {
  const [open, setOpen] = useState(false);
  const skipReturnFocus = useRef(false);
  const filled = feedback.trim() !== '';

  if (!editable) {
    return filled ? <ReadonlyFeedback feedback={feedback} /> : null;
  }

  const commit = () => {
    skipReturnFocus.current = true;
    setOpen(false);
    window.requestAnimationFrame(onCommitNext);
  };
  const field = (
    <Input
      autoFocus
      value={feedback}
      placeholder="Необязательно"
      aria-label={`Общий отзыв: ${attempt.student.fullName}`}
      onChange={(event) => onFeedbackChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
      }}
    />
  );
  const trigger = (
    <Button
      type="button"
      variant={filled ? 'secondary' : 'ghost'}
      size={layout === 'mobile' ? 'sm' : 'icon'}
      title={filled ? feedback : 'Добавить общий отзыв'}
      aria-label={filled ? `Общий отзыв: ${feedback}` : 'Добавить общий отзыв'}
      onClick={(event) => {
        event.stopPropagation();
        setOpen(true);
      }}
      className={cn(
        filled ? 'text-primary' : 'text-muted-foreground',
        layout === 'mobile' ? 'ml-auto flex max-w-full' : null
      )}
    >
      {filled ? <MessageSquareText /> : <MessageSquarePlus />}
      {layout === 'mobile' ? (
        <span className="truncate">{filled ? feedback : 'Отзыв'}</span>
      ) : null}
    </Button>
  );

  if (layout === 'mobile') {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-4 pb-6">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle>Общий отзыв</DrawerTitle>
              <DrawerDescription>
                {attempt.student.fullName} · #{attempt.attemptNumber}{' '}
                {attempt.task.title}. Увидит Student вместе с баллом.
              </DrawerDescription>
            </DrawerHeader>
            {field}
            <Button type="button" className="mt-3 h-11" onClick={commit}>
              Готово
            </Button>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        skipReturnFocus.current = false;
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96"
        onCloseAutoFocus={(event) => {
          if (skipReturnFocus.current) {
            event.preventDefault();
          }
        }}
      >
        <p className="text-sm font-semibold">Общий отзыв</p>
        <p className="mb-2 truncate text-xs text-muted-foreground">
          {attempt.student.fullName} · увидит Student вместе с баллом
        </p>
        {field}
        <KeyHints>
          <Kbd>Enter</Kbd> следующий балл · <Kbd>Esc</Kbd> закрыть
        </KeyHints>
      </PopoverContent>
    </Popover>
  );
}

// ── B: always-visible inline field ──────────────────────────────────────────

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
      placeholder="Общий отзыв — необязательно"
      aria-label={`Общий отзыв: ${attempt.student.fullName}`}
      onFocus={onFocus}
      onChange={(event) => onFeedbackChange(event.target.value)}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onCommitNext();
        }
      }}
      className="h-10"
    />
  );
}

// ── C, D: read-only preview in the row ──────────────────────────────────────

export function FeedbackPreview({
  feedback,
  emptyLabel,
  onClick,
}: {
  feedback: string;
  emptyLabel?: string;
  onClick?: () => void;
}) {
  const filled = feedback.trim() !== '';

  if (!filled && !emptyLabel) {
    return null;
  }

  const content = filled ? (
    <>
      <MessageSquareText className="size-3.5 shrink-0 text-primary" />
      <span className="truncate">{feedback}</span>
    </>
  ) : (
    <>
      <MessageSquarePlus className="size-3.5 shrink-0" />
      <span className="truncate">{emptyLabel}</span>
    </>
  );

  if (!onClick) {
    return (
      <span
        title={feedback || undefined}
        className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      title={feedback || undefined}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex w-full min-w-0 items-center gap-1.5 rounded-md text-left text-xs',
        'text-muted-foreground hover:text-foreground',
        filled ? null : 'opacity-70'
      )}
    >
      {content}
    </button>
  );
}

function ReadonlyFeedback({ feedback }: { feedback: string }) {
  return <FeedbackPreview feedback={feedback} />;
}

export function KeyHints({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {children}
    </p>
  );
}
