// PROTOTYPE (#181): variant B — a list of Tasks with their general deadline;
// a click opens a side panel with every override of that Task.
import { useCallback } from 'react';
import { CalendarArrowUp, ChevronRight, Clock, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { cn } from '@/shadcn/lib/utils';
import { dockPadding } from '@/features/course/prototype/task-and-deadline-settings/panel/layout';
import { PanelFrame } from '@/features/course/prototype/task-and-deadline-settings/panel/panel-frame';
import { overrideCounts } from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  usePrototypeSettings,
  useUpdatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  useOrderedTasks,
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatCompactMoment,
  NOW,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { DeadlineText } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { TaskScheduleEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/task-schedule-editor';
import type { DeadlinesViewProps } from './page';

export function TaskListView({
  selection,
  setSelection,
  onShift,
}: DeadlinesViewProps) {
  const { task: openTaskId } = usePrototypeSettings();
  const update = useUpdatePrototypeSearch();
  const schedule = useViewSchedule();
  const tasks = useSandbox((state) => state.tasks);
  const groups = useOrderedTasks();
  const { changes } = usePendingChanges();
  const openTask = openTaskId ? tasks[openTaskId] : undefined;
  const close = useCallback(() => update({ task: undefined }), [update]);

  return (
    <div className={cn('grid gap-6', dockPadding(Boolean(openTask), 'dock'))}>
      {groups.map(({ group, tasks: items }) => (
        <section key={group.id} className="grid gap-1">
          <h2 className="flex items-baseline gap-2 px-1 text-sm font-semibold">
            {group.title}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {group.key} · порядок выполнения
            </span>
          </h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {items.map((task, index) => {
              const taskSchedule = schedule.tasks[task.id]!;
              const counts = overrideCounts(schedule, task.id);
              const pending = changes.some(
                (change) => change.taskId === task.id
              );
              const open = task.id === openTaskId;

              return (
                <li
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5',
                    open && 'bg-primary/8',
                    selection.has(task.id) && !open && 'bg-primary/4'
                  )}
                >
                  <Checkbox
                    aria-label={`Выбрать ${task.title}`}
                    checked={selection.has(task.id)}
                    onCheckedChange={(value) => {
                      const next = new Set(selection);
                      if (value === true) {
                        next.add(task.id);
                      } else {
                        next.delete(task.id);
                      }
                      setSelection(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => update({ task: open ? undefined : task.id })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {index + 1}.
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {task.title}
                        </span>
                        {pending ? (
                          <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                        ) : null}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {task.key}
                      </span>
                    </span>
                    <span className="grid shrink-0 justify-items-end gap-0.5 text-right text-sm">
                      <DeadlineText value={taskSchedule.deadline} />
                      <span className="text-xs text-muted-foreground">
                        {counts.total === 0
                          ? 'один срок для всех'
                          : `групп ${counts.groups} · личных ${counts.students}`}
                      </span>
                      {taskSchedule.openingTime &&
                      taskSchedule.openingTime > NOW ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" /> откроется{' '}
                          {formatCompactMoment(
                            taskSchedule.openingTime,
                            '00:00'
                          )}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground',
                        open && 'text-primary'
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {openTask ? (
        <PanelFrame layout="dock" label="Сроки Task" onEscape={close}>
          <header className="flex items-start gap-2 border-b px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Сроки Task</p>
              <h2 className="truncate text-lg font-semibold">
                {openTask.title}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShift({ taskIds: [openTask.id] })}
            >
              <CalendarArrowUp /> Сдвиг
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Закрыть"
              onClick={close}
            >
              <X />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-32">
            <TaskScheduleEditor
              key={openTask.id}
              taskId={openTask.id}
              taskTitle={openTask.title}
            />
          </div>
        </PanelFrame>
      ) : null}
    </div>
  );
}
