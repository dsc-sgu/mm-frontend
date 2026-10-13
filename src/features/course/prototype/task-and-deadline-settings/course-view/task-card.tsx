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
        Задание недоступно: {taskId}
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
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                <Trophy className="size-4" aria-hidden="true" />
                Задание
              </span>
              <span className="text-muted-foreground">{group?.title}</span>
              {draftEdits && taskApply === 'course' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-800 dark:text-violet-300">
                  <FileStack className="size-3" /> есть правки в черновике
                </span>
              ) : null}
              {recentlyApplied ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                  Обновлено в {formatClock(lastApplied!.at)}
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
            <span className="text-xs">{timeZoneLabel()}</span>
            {counts.total > 0 ? (
              <span className="text-xs">
                У части студентов свой дедлайн ({counts.total})
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
      {!selected ? (
        <span className="pointer-events-none absolute right-3 bottom-3 hidden items-center gap-1 rounded-md bg-background px-2 py-1 text-xs font-medium shadow-sm group-hover/card:inline-flex">
          <Settings2 className="size-3.5" /> Настроить
        </span>
      ) : null}
      {inline ? (
        <div className="grid gap-2 border-t border-primary/30 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">Условие</span>
            <span className="text-xs text-muted-foreground">
              Сохраняется кнопкой в панели
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
