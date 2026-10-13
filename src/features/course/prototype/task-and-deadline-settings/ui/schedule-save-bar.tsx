// PROTOTYPE (#181): `?apply=instant` shows whether each value is saved;
// `?apply=batch` collects edits and applies them with a preview.
import { useState } from 'react';
import {
  Check,
  ChevronUp,
  CloudAlert,
  LoaderCircle,
  TriangleAlert,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { formatClock } from '@/features/course/prototype/task-and-deadline-settings/time';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { ChangesList } from '@/features/course/prototype/task-and-deadline-settings/ui/changes-list';

export function ScheduleSaveBar({
  note,
  floating = true,
}: {
  note?: string;
  /** False renders in the flow, for hosts that stack their own bars. */
  floating?: boolean;
}) {
  const { apply } = usePrototypeSettings();
  const save = useSandbox((state) => state.save);
  const schedule = useSandbox((state) => state.schedule);
  const view = useViewSchedule();
  const applyPending = useSandbox((state) => state.applyPending);
  const discardPending = useSandbox((state) => state.discardPending);
  const dropPending = useSandbox((state) => state.dropPending);
  const retrySave = useSandbox((state) => state.retrySave);
  const { changes, lateness } = usePendingChanges();
  const [expanded, setExpanded] = useState(false);

  const shell = cn(
    floating &&
      'fixed bottom-16 left-1/2 z-40 w-[calc(100%-1rem)] max-w-3xl -translate-x-1/2',
    'rounded-xl border bg-background/95 shadow-lg backdrop-blur'
  );

  if (save.status === 'failed') {
    return (
      <div className={cn(shell, 'border-destructive/50')}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
          <CloudAlert className="size-4 text-destructive" />
          <span className="min-w-0 flex-1">
            <span className="font-medium text-destructive">
              Сроки не сохранены.
            </span>{' '}
            {save.label}. Сеть недоступна — значения на экране ещё не применены.
          </span>
          <Button size="sm" onClick={() => void retrySave()}>
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  if (apply === 'instant') {
    return (
      <div className={cn(shell, 'w-auto max-w-[calc(100%-1rem)]')}>
        <div className="flex items-center gap-2 px-4 py-2 text-sm">
          {save.status === 'saving' ? (
            <>
              <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
              Сохраняется: {save.label}
            </>
          ) : save.status === 'saved' ? (
            <>
              <Check className="size-4 text-emerald-600" />
              Сохранено в {formatClock(save.at)}: {save.label}
            </>
          ) : (
            <span className="text-muted-foreground">
              Каждое значение сохраняется сразу
              {note ? ` · ${note}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className={cn(shell, 'w-auto max-w-[calc(100%-1rem)]')}>
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
          {save.status === 'saving' ? (
            <>
              <LoaderCircle className="size-4 animate-spin" /> Применяется…
            </>
          ) : save.status === 'saved' ? (
            <>
              <Check className="size-4 text-emerald-600" /> Применено в{' '}
              {formatClock(save.at)}. Неприменённых правок нет
            </>
          ) : (
            <>Неприменённых правок нет{note ? ` · ${note}` : ''}</>
          )}
        </div>
      </div>
    );
  }

  const flips = lateness.becameLate.length + lateness.becameOnTime.length;

  return (
    <div className={cn(shell, 'border-amber-500/50')}>
      {expanded ? (
        <div className="max-h-[45dvh] overflow-y-auto border-b">
          <ChangesList
            changes={changes}
            before={schedule}
            after={view}
            onRevert={(key) => dropPending(new Set([key]))}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 font-medium"
        >
          <span className="size-2 rounded-full bg-amber-500" />
          Не применено: {changes.length}
          <ChevronUp
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              !expanded && 'rotate-180'
            )}
          />
        </button>
        {flips > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TriangleAlert className="size-3.5 text-amber-600" />
            Attempts: {lateness.becameLate.length} станут опоздавшими,{' '}
            {lateness.becameOnTime.length} перестанут
          </span>
        ) : null}
        {note ? (
          <span className="text-xs text-muted-foreground">{note}</span>
        ) : null}
        <span className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={discardPending}>
            Отменить все
          </Button>
          <Button
            size="sm"
            disabled={save.status === 'saving'}
            onClick={() => void applyPending()}
          >
            {save.status === 'saving' ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            Применить {changes.length}
          </Button>
        </span>
      </div>
    </div>
  );
}
