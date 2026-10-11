// PROTOTYPE (#121): Overall Feedback affordances of variants A and B, plus a
// read-only viewer for feedback already published in a Review.
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

export type PublishedFeedback = {
  text: string;
  author: string;
};

export type FeedbackCellProps = {
  layout: RowLayout;
  attempt: CourseAttempt;
  feedback: string;
  editable: boolean;
  published: PublishedFeedback | null;
  onFeedbackChange: (value: string) => void;
  onCommitNext: () => void;
};

// ── A: icon button → popover (desktop) / drawer (phone) ────────────────────

export function PopoverFeedbackCell({
  layout,
  attempt,
  feedback,
  editable,
  published,
  onFeedbackChange,
  onCommitNext,
}: FeedbackCellProps) {
  const [open, setOpen] = useState(false);
  const skipReturnFocus = useRef(false);
  const filled = feedback.trim() !== '';

  if (!editable) {
    return published ? (
      <FeedbackViewer
        layout={layout}
        attempt={attempt}
        published={published}
        trigger="icon"
      />
    ) : null;
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
                {attempt.student.fullName} · №{attempt.attemptNumber}{' '}
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
  layout,
  attempt,
  feedback,
  editable,
  published,
  onFeedbackChange,
  onCommitNext,
  inputRef,
  onFocus,
}: FeedbackCellProps & {
  inputRef: (element: HTMLInputElement | null) => void;
  onFocus: () => void;
}) {
  if (!editable) {
    return published ? (
      <FeedbackViewer
        layout={layout}
        attempt={attempt}
        published={published}
        trigger="text"
      />
    ) : null;
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
      className="h-9"
    />
  );
}

// ── read-only viewer for published Overall Feedback ─────────────────────────

function FeedbackViewer({
  layout,
  attempt,
  published,
  trigger,
}: {
  layout: RowLayout;
  attempt: CourseAttempt;
  published: PublishedFeedback;
  trigger: 'icon' | 'text';
}) {
  const [open, setOpen] = useState(false);
  const label = `Посмотреть общий отзыв: ${attempt.student.fullName}`;
  const triggerButton =
    trigger === 'icon' ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={-1}
        title="Посмотреть общий отзыв"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <MessageSquareText />
      </Button>
    ) : (
      <button
        type="button"
        tabIndex={-1}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          'flex w-full min-w-0 items-center gap-1.5 rounded-md text-left',
          'text-xs text-muted-foreground hover:text-foreground'
        )}
      >
        <MessageSquareText className="size-3.5 shrink-0" />
        <span className="truncate">{published.text}</span>
      </button>
    );
  const body = (
    <>
      <p className="text-xs text-muted-foreground">
        {published.author} · {attempt.student.fullName}, №
        {attempt.attemptNumber}
      </p>
      <p className="mt-2 max-h-60 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
        {published.text}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Изменить можно только в individual review.
      </p>
    </>
  );

  if (layout === 'mobile') {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-4 pb-6">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle>Общий отзыв</DrawerTitle>
              <DrawerDescription className="sr-only">
                Опубликованный общий отзыв
              </DrawerDescription>
            </DrawerHeader>
            {body}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <p className="text-sm font-semibold">Общий отзыв</p>
        {body}
      </PopoverContent>
    </Popover>
  );
}

export function KeyHints({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {children}
    </p>
  );
}
