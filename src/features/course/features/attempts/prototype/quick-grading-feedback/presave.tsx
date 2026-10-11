// PROTOTYPE (#121): variant D — rows carry only the Grade; Overall Feedback is
// added on a separate step that lists every entry about to be published.
import { useRef } from 'react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shadcn/components/ui/drawer';
import { Input } from '@/shadcn/components/ui/input';
import { Kbd } from '@/shadcn/components/ui/kbd';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import { KeyHints } from '@/features/course/features/attempts/prototype/quick-grading-feedback/feedback';
import type { RowLayout } from '@/features/course/features/attempts/prototype/quick-grading-feedback/row';
import type { QuickEntry } from '@/features/course/features/attempts/prototype/quick-grading-feedback/session';

type PresaveItem = {
  attempt: CourseAttempt;
  entry: QuickEntry;
};

export function PresaveSheet({
  open,
  layout,
  items,
  onOpenChange,
  onFeedbackChange,
  onPublish,
}: {
  open: boolean;
  layout: RowLayout;
  items: readonly PresaveItem[];
  onOpenChange: (open: boolean) => void;
  onFeedbackChange: (attemptId: string, value: string) => void;
  onPublish: () => void;
}) {
  const fieldsRef = useRef<Array<HTMLInputElement | null>>([]);
  const publishRef = useRef<HTMLButtonElement | null>(null);
  const title = `Опубликовать ${items.length} ${pluralReviews(items.length)}`;
  const description =
    'Student увидит балл и отзыв сразу после публикации. Отзыв необязателен.';

  const list = (
    <ol className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
      {items.map(({ attempt, entry }, index) => (
        <li
          key={attempt.id}
          className="grid gap-1.5 rounded-xl border border-border p-3"
        >
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-sm">
              <span className="font-semibold">{attempt.student.fullName}</span>
              <span className="text-muted-foreground">
                {' '}
                · #{attempt.attemptNumber} {attempt.task.title}
              </span>
            </p>
            <span className="shrink-0 text-sm font-semibold">
              {entry.grade} / {attempt.task.maxScore}
            </span>
          </div>
          <Input
            ref={(element) => {
              fieldsRef.current[index] = element;
            }}
            autoFocus={index === 0}
            value={entry.feedback}
            placeholder="Общий отзыв — необязательно"
            onChange={(event) =>
              onFeedbackChange(attempt.id, event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                onPublish();
                return;
              }

              if (event.key === 'Enter') {
                event.preventDefault();
                (fieldsRef.current[index + 1] ?? publishRef.current)?.focus();
              }
            }}
          />
        </li>
      ))}
    </ol>
  );
  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Вернуться к баллам
      </Button>
      <Button ref={publishRef} type="button" onClick={onPublish}>
        {title}
      </Button>
    </>
  );

  if (layout === 'mobile') {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Проверка перед публикацией</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          {list}
          <DrawerFooter className="px-0">{actions}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Проверка перед публикацией</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {list}
        <KeyHints>
          <Kbd>Enter</Kbd> следующий отзыв · <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd>{' '}
          опубликовать
        </KeyHints>
        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function pluralReviews(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'Review';
  }

  return 'Reviews';
}
