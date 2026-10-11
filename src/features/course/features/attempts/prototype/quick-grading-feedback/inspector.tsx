// PROTOTYPE (#121): variant C — Overall Feedback of the active row is edited in
// a docked inspector that takes the place of the (locked) filters.
import type { KeyboardEvent } from 'react';
import { MessageSquareText } from 'lucide-react';

import { Input } from '@/shadcn/components/ui/input';
import { Kbd } from '@/shadcn/components/ui/kbd';
import { cn } from '@/shadcn/lib/utils';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import { KeyHints } from '@/features/course/features/attempts/prototype/quick-grading-feedback/feedback';

type InspectorProps = {
  placement: 'sidebar' | 'bar';
  attempt: CourseAttempt | null;
  grade: string;
  feedback: string;
  editable: boolean;
  fieldRef: (element: HTMLTextAreaElement | HTMLInputElement | null) => void;
  onFeedbackChange: (value: string) => void;
  onFieldKeyDown: (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => void;
};

export function FeedbackInspector(props: InspectorProps) {
  return props.placement === 'sidebar' ? (
    <SidebarInspector {...props} />
  ) : (
    <BarInspector {...props} />
  );
}

function SidebarInspector({
  attempt,
  grade,
  feedback,
  editable,
  fieldRef,
  onFeedbackChange,
  onFieldKeyDown,
}: InspectorProps) {
  return (
    <aside
      className={cn(
        'sticky top-20 self-start rounded-3xl border border-border bg-card',
        'p-5'
      )}
    >
      <h2 className="flex items-center gap-2 font-semibold">
        <MessageSquareText className="size-4" /> Общий отзыв
      </h2>
      {attempt ? (
        <>
          <div className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm leading-snug">
            <p className="truncate font-semibold">{attempt.student.fullName}</p>
            <p className="truncate text-muted-foreground">
              #{attempt.attemptNumber} · {attempt.task.title}
            </p>
            <p className="mt-1 text-muted-foreground">
              Балл:{' '}
              <span className="font-semibold text-foreground">
                {grade || '—'} / {attempt.task.maxScore}
              </span>
            </p>
          </div>
          {editable ? (
            <>
              <textarea
                ref={fieldRef}
                rows={6}
                value={feedback}
                placeholder="Необязательно. Увидит Student вместе с баллом."
                aria-label={`Общий отзыв: ${attempt.student.fullName}`}
                onChange={(event) => onFeedbackChange(event.target.value)}
                onKeyDown={onFieldKeyDown}
                className={cn(
                  'mt-3 w-full resize-none rounded-xl border border-input',
                  'bg-transparent px-3 py-2 text-sm outline-none',
                  'focus-visible:border-ring focus-visible:ring-[3px]',
                  'focus-visible:ring-ring/50 dark:bg-input/30'
                )}
              />
              <KeyHints>
                <Kbd>Tab</Kbd> из балла — сюда · <Kbd>Enter</Kbd> следующий балл
                · <Kbd>Shift</Kbd>+<Kbd>Tab</Kbd> назад к баллу
              </KeyHints>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {feedback
                ? `Опубликовано: «${feedback}»`
                : 'Review уже есть. Изменить её можно только в individual review.'}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Поставьте курсор в поле балла — здесь появится отзыв для этой попытки.
        </p>
      )}
    </aside>
  );
}

function BarInspector({
  attempt,
  feedback,
  editable,
  fieldRef,
  onFeedbackChange,
  onFieldKeyDown,
}: InspectorProps) {
  return (
    <div className="mb-2 grid gap-1 border-b border-border pb-2">
      <p className="truncate text-xs text-muted-foreground">
        {attempt
          ? `Отзыв · ${attempt.student.fullName} · #${attempt.attemptNumber}`
          : 'Отзыв · выберите строку'}
      </p>
      <Input
        ref={fieldRef}
        value={feedback}
        disabled={!attempt || !editable}
        placeholder="Общий отзыв — необязательно"
        onChange={(event) => onFeedbackChange(event.target.value)}
        onKeyDown={onFieldKeyDown}
        className="h-10"
      />
    </div>
  );
}
