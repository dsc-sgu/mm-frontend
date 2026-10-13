// PROTOTYPE (#181): `?apply=batch` review before applying, after Arcade's
// «Review changes»: one row per value, «было → стало», a checkbox to keep a
// change out of this apply. Unchecked changes stay pending.
import { useMemo, useState } from 'react';
import { ArrowRight, LoaderCircle, TriangleAlert } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import { cn } from '@/shadcn/lib/utils';
import {
  applyCommands,
  latenessChanges,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  ATTEMPTS,
  commandKey,
  STUDENTS,
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import {
  changeTarget,
  inheritedValue,
} from '@/features/course/prototype/task-and-deadline-settings/ui/change-labels';
import { DeadlineText } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';

export function ReviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <ReviewBody onClose={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function ReviewBody({ onClose }: { onClose: () => void }) {
  const { changes } = usePendingChanges();
  const schedule = useSandbox((state) => state.schedule);
  const pending = useSandbox((state) => state.pending);
  const tasks = useSandbox((state) => state.tasks);
  const applyPendingKeys = useSandbox((state) => state.applyPendingKeys);
  const view = useViewSchedule();
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => changes.filter((change) => !excluded.has(change.key)),
    [changes, excluded]
  );
  const flips = useMemo(() => {
    const keys = new Set(selected.map((change) => change.key));
    const after = applyCommands(
      schedule,
      pending.filter((command) => keys.has(commandKey(command)))
    );
    return latenessChanges(schedule, after, ATTEMPTS, STUDENTS);
  }, [pending, schedule, selected]);

  function toggle(key: string) {
    const next = new Set(excluded);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExcluded(next);
  }

  async function apply() {
    setBusy(true);
    const ok = await applyPendingKeys(
      new Set(selected.map((change) => change.key))
    );
    setBusy(false);
    if (ok) {
      onClose();
    }
  }

  return (
    <DialogContent className="flex max-h-[88dvh] flex-col gap-0 p-0 sm:max-w-3xl">
      <DialogHeader className="px-5 pt-5 pb-3">
        <DialogTitle>Проверить изменения дедлайнов</DialogTitle>
        <DialogDescription>
          Применятся отмеченные строки. Остальные останутся неприменёнными.
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto border-y">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur">
            <tr>
              <th className="w-10 py-2 pl-5">
                <Checkbox
                  aria-label="Отметить все"
                  checked={
                    excluded.size === 0
                      ? true
                      : selected.length === 0
                        ? false
                        : 'indeterminate'
                  }
                  onCheckedChange={() =>
                    setExcluded(
                      excluded.size === 0
                        ? new Set(changes.map((change) => change.key))
                        : new Set()
                    )
                  }
                />
              </th>
              <th className="py-2 font-medium">Задание</th>
              <th className="py-2 font-medium">Что</th>
              <th className="py-2 font-medium">Было</th>
              <th className="w-6" />
              <th className="py-2 pr-5 font-medium">Стало</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => {
              const off = excluded.has(change.key);
              const time = change.level === 'opening' ? '00:00' : '23:59';
              return (
                <tr
                  key={change.key}
                  className={cn('border-t', off && 'text-muted-foreground')}
                >
                  <td className="py-2 pl-5">
                    <Checkbox
                      aria-label="Применить эту правку"
                      checked={!off}
                      onCheckedChange={() => toggle(change.key)}
                    />
                  </td>
                  <td className="max-w-48 truncate py-2 pr-3">
                    {tasks[change.taskId]?.title}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {changeTarget(change)}
                  </td>
                  <td className="py-2 pr-1">
                    <DeadlineText
                      compact
                      defaultTime={time}
                      value={change.before}
                      inherited={inheritedValue(schedule, change)}
                    />
                  </td>
                  <td className="py-2 text-muted-foreground">
                    <ArrowRight className="size-3.5" />
                  </td>
                  <td className={cn('py-2 pr-5', off && 'opacity-50')}>
                    <DeadlineText
                      compact
                      defaultTime={time}
                      value={change.after}
                      inherited={inheritedValue(view, change)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DialogFooter className="items-center px-5 py-3 sm:justify-between">
        <div className="grid gap-0.5 text-xs text-muted-foreground">
          <span>
            Выбрано {selected.length} из {changes.length}
          </span>
          {flips.becameLate.length + flips.becameOnTime.length > 0 ? (
            <span className="flex items-center gap-1">
              <TriangleAlert className="size-3.5 text-amber-600" />
              Попытки: станут опоздавшими {flips.becameLate.length}, перестанут{' '}
              {flips.becameOnTime.length}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={busy || selected.length === 0} onClick={apply}>
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            Применить {selected.length}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
