// PROTOTYPE (#181): how a Teacher knows whether schedule edits are saved.
// `?apply=instant` — a quiet status next to the page actions, like an
// autosave label. `?apply=batch` — an unsaved-changes bar (Discord, Shopify)
// whose «Проверить» opens the review dialog. A failed save shows in both.
import { useState, type ReactNode } from 'react';
import { Check, CloudAlert, LoaderCircle } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { DOCK_CENTER_LEFT } from '@/features/course/prototype/task-and-deadline-settings/panel/layout';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import { formatClock } from '@/features/course/prototype/task-and-deadline-settings/time';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { ReviewDialog } from '@/features/course/prototype/task-and-deadline-settings/ui/review-dialog';
import { plural } from '@/features/course/prototype/task-and-deadline-settings/ui/shift/model';

/** Inline status for toolbars. */
export function ScheduleStatus({ className }: { className?: string }) {
  const { apply } = usePrototypeSettings();
  const save = useSandbox((state) => state.save);
  const { changes } = usePendingChanges();

  const text =
    save.status === 'saving' ? (
      <>
        <LoaderCircle className="size-3.5 animate-spin" />
        Сохраняется…
      </>
    ) : apply === 'batch' && changes.length > 0 ? null : save.status ===
      'saved' ? (
      <>
        <Check className="size-3.5 text-emerald-600" />
        Сохранено в {formatClock(save.at)}
      </>
    ) : apply === 'instant' ? (
      'Изменения сохраняются сразу'
    ) : null;

  if (!text) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
      aria-live="polite"
    >
      {text}
    </span>
  );
}

const BAR = cn(
  'pointer-events-auto flex w-full flex-wrap items-center gap-x-3 gap-y-2',
  'rounded-xl border bg-background px-4 py-2.5 text-sm shadow-lg'
);

/** Bottom dock above the prototype switcher: errors, unsaved bar, extras. */
export function ScheduleDock({
  children,
  floating = true,
  note,
}: {
  children?: ReactNode;
  floating?: boolean;
  /** Extra context for the unsaved bar, e.g. inside the editor. */
  note?: string;
}) {
  const { apply } = usePrototypeSettings();
  const save = useSandbox((state) => state.save);
  const retrySave = useSandbox((state) => state.retrySave);
  const discardPending = useSandbox((state) => state.discardPending);
  const { changes, lateness } = usePendingChanges();
  const [reviewing, setReviewing] = useState(false);
  const flips = lateness.becameLate.length + lateness.becameOnTime.length;

  return (
    <div
      style={floating ? { left: DOCK_CENTER_LEFT } : undefined}
      className={cn(
        'pointer-events-none grid w-[calc(100%-1rem)] max-w-3xl justify-items-center gap-2',
        floating && 'fixed bottom-16 z-40 -translate-x-1/2'
      )}
    >
      {children}
      {save.status === 'failed' ? (
        <div className={cn(BAR, 'border-destructive/40')} role="alert">
          <CloudAlert className="size-4 text-destructive" />
          <span className="min-w-0 flex-1">
            Не удалось сохранить: {save.label}. Значения ещё не применены.
          </span>
          <Button size="sm" onClick={() => void retrySave()}>
            Повторить
          </Button>
        </div>
      ) : apply === 'batch' && changes.length > 0 ? (
        <div className={BAR}>
          <span className="size-2 rounded-full bg-amber-500" />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Не применено: {changes.length}</span>
            {note ? (
              <span className="block text-xs text-muted-foreground">
                {note}
              </span>
            ) : null}
            {flips > 0 ? (
              <span className="text-muted-foreground">
                , опоздание изменится у {flips}{' '}
                {plural(flips, 'попытки', 'попыток', 'попыток')}
              </span>
            ) : null}
          </span>
          <Button variant="ghost" size="sm" onClick={discardPending}>
            Отменить все
          </Button>
          <Button
            size="sm"
            disabled={save.status === 'saving'}
            onClick={() => setReviewing(true)}
          >
            {save.status === 'saving' ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            Проверить и применить
          </Button>
        </div>
      ) : null}
      <ReviewDialog open={reviewing} onOpenChange={setReviewing} />
    </div>
  );
}
