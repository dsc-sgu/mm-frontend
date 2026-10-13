// PROTOTYPE (#181): Task Reference card on the Course Page with the Task
// Summary a Teacher needs, and the in-document statement editor.
import type { ReactNode } from 'react';
import {
  CalendarDays,
  Clock,
  FileStack,
  Settings2,
  Trophy,
} from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import { overrideCounts } from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatClock,
  formatMoment,
  NOW,
  timeZoneLabel,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { NoDeadline } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { StatementTextarea } from '@/features/course/prototype/task-and-deadline-settings/panel/fields';
import { usePanelSession } from '@/features/course/prototype/task-and-deadline-settings/panel/session';

export function TaskReferenceCard({
  taskId,
  selected,
  remembered,
  onOpen,
  footer,
}: {
  taskId: string;
  selected: boolean;
  remembered: boolean;
  onOpen: () => void;
  footer?: ReactNode;
}) {
  const { statement, taskApply } = usePrototypeSettings();
  const task = useSandbox((state) => state.tasks[taskId]);
  const schedule = useSandbox((state) => state.schedule);
  const group = useSandbox((state) =>
    state.taskGroups.find((item) => item.id === task?.groupId)
  );
  const draftEdits = useSandbox((state) => state.draft?.taskEdits[taskId]);
  const lastApplied = useSandbox((state) => state.lastApplied);
  const session = usePanelSession();

  if (!task) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Task недоступна: {taskId}
      </div>
    );
  }

  const taskSchedule = schedule.tasks[taskId];
  const counts = overrideCounts(schedule, taskId);
  const inline =
    statement === 'inline' && selected && session?.taskId === taskId
      ? session
      : null;
  const recentlyApplied = lastApplied?.taskIds.includes(taskId);

  return (
    <div
      id={`task-ref-${taskId}`}
      className={cn(
        'group/card relative my-4 scroll-mt-24 rounded-xl border bg-primary/3 transition-shadow',
        'md:rounded-2xl dark:border-white/10',
        selected
          ? 'border-primary ring-2 ring-primary/40'
          : remembered
            ? 'border-primary/40 ring-1 ring-primary/20'
            : 'border-black/10'
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'block w-full rounded-xl p-4 text-left transition-colors hover:bg-primary/6 md:p-5',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
        )}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase md:text-sm">
              <Trophy className="size-4" aria-hidden="true" />
              Задание
              <span className="font-normal tracking-normal text-muted-foreground normal-case">
                {group?.title} · <span className="font-mono">{task.key}</span>
              </span>
              {draftEdits && taskApply === 'course' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium tracking-normal text-violet-700 normal-case dark:text-violet-300">
                  <FileStack className="size-3" /> правки в черновике
                </span>
              ) : null}
              {recentlyApplied ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium tracking-normal text-emerald-700 normal-case dark:text-emerald-300">
                  обновлено {formatClock(lastApplied!.at)}
                </span>
              ) : null}
            </div>
            <h3 className="text-lg font-semibold tracking-tight md:text-xl">
              {task.title || 'Без названия'}
            </h3>
            {task.annotation ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {task.annotation}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1.5 text-sm text-muted-foreground md:items-end md:text-right">
            {taskSchedule?.deadline.kind === 'at' ? (
              <span className="inline-flex items-center gap-2 text-foreground">
                <CalendarDays className="size-4" aria-hidden="true" />
                до {formatMoment(taskSchedule.deadline.at)}
              </span>
            ) : (
              <NoDeadline />
            )}
            <span className="text-[11px]">{timeZoneLabel()}</span>
            {counts.total > 0 ? (
              <span className="text-xs">
                свой срок: групп {counts.groups}, Students {counts.students}
              </span>
            ) : null}
            {taskSchedule?.openingTime && taskSchedule.openingTime > NOW ? (
              <span className="inline-flex items-center gap-1 text-xs">
                <Clock className="size-3" /> откроется{' '}
                {formatMoment(taskSchedule.openingTime)}
              </span>
            ) : null}
            {task.maxGrade !== null ? (
              <span>Максимум: {task.maxGrade}</span>
            ) : null}
          </div>
        </div>
      </button>
      <span
        className={cn(
          'pointer-events-none absolute top-3 right-3 hidden items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow-sm',
          'group-hover/card:inline-flex',
          selected && 'hidden!'
        )}
      >
        <Settings2 className="size-3.5" /> Настроить
      </span>
      {inline ? (
        <div className="grid gap-2 border-t border-primary/30 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">Условие — правка в документе</span>
            <span className="text-xs text-muted-foreground">
              применяется кнопкой в панели
            </span>
          </div>
          <StatementTextarea
            autoFocus
            value={inline.form.statement}
            rows={inline.form.statement.length > 600 ? 18 : 6}
            onChange={(value) => inline.setField('statement', value)}
          />
        </div>
      ) : null}
      {footer}
    </div>
  );
}
