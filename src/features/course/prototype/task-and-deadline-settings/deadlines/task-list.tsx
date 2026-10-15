// PROTOTYPE (#181): variant B — a list of Tasks with their general deadline
// (Asana list view); a click opens a side panel with every value of that
// Task as property rows (Twenty / Linear side panels).
import { Fragment, useCallback, useState } from 'react';
import { CalendarArrowUp, ChevronRight, Clock, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { cn } from '@/shadcn/lib/utils';
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

function Badge({
  tone,
  children,
}: {
  tone: 'group' | 'student';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-px text-xs whitespace-nowrap',
        tone === 'group'
          ? 'bg-sky-500/10 text-sky-800 dark:text-sky-300'
          : 'bg-violet-500/10 text-violet-800 dark:text-violet-300'
      )}
    >
      {children}
    </span>
  );
}

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
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const openTask = openTaskId ? tasks[openTaskId] : undefined;
  const close = useCallback(() => update({ task: undefined }), [update]);

  return (
    <div className="grid gap-1">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border bg-card">
        {groups.map(({ group, tasks: items }) => {
          const isCollapsed = collapsed.has(group.id);

          return (
            <Fragment key={group.id}>
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => {
                  const next = new Set(collapsed);
                  if (isCollapsed) {
                    next.delete(group.id);
                  } else {
                    next.add(group.id);
                  }
                  setCollapsed(next);
                }}
                className="flex h-10 w-full items-center gap-1.5 border-b bg-muted/30 px-3 text-left text-sm font-medium hover:bg-muted/60"
              >
                <ChevronRight
                  className={cn(
                    'size-4 text-muted-foreground transition-transform',
                    !isCollapsed && 'rotate-90'
                  )}
                />
                {group.title}
                <span className="font-normal text-muted-foreground">
                  {items.length}
                </span>
              </button>
              {isCollapsed
                ? null
                : items.map((task, index) => {
                    const taskSchedule = schedule.tasks[task.id]!;
                    const counts = overrideCounts(schedule, task.id);
                    const pending = changes.some(
                      (change) => change.taskId === task.id
                    );
                    const open = task.id === openTaskId;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'flex items-center gap-3 border-b px-3 last:border-b-0',
                          open && 'bg-primary/6',
                          !open && selection.has(task.id) && 'bg-primary/3',
                          !open &&
                            !selection.has(task.id) &&
                            'hover:bg-muted/40'
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
                          onClick={() =>
                            update({ task: open ? undefined : task.id })
                          }
                          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 text-left"
                        >
                          <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate">{task.title}</span>
                              {pending ? (
                                <span
                                  title="Есть неприменённые правки"
                                  className="size-2 shrink-0 rounded-full bg-amber-500"
                                />
                              ) : null}
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {counts.groups > 0 ? (
                                <Badge tone="group">
                                  групп: {counts.groups}
                                </Badge>
                              ) : null}
                              {counts.students > 0 ? (
                                <Badge tone="student">
                                  личных: {counts.students}
                                </Badge>
                              ) : null}
                              {taskSchedule.openingTime &&
                              taskSchedule.openingTime > NOW ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="size-3" />
                                  откроется{' '}
                                  {formatCompactMoment(
                                    taskSchedule.openingTime,
                                    '00:00'
                                  )}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm">
                            <DeadlineText value={taskSchedule.deadline} />
                          </span>
                          <ChevronRight
                            className={cn(
                              'size-4 shrink-0 text-muted-foreground',
                              open && 'text-foreground'
                            )}
                          />
                        </button>
                      </div>
                    );
                  })}
            </Fragment>
          );
        })}
      </div>

      {openTask ? (
        <PanelFrame layout="dock" label="Дедлайны задания" onEscape={close}>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-5">
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              Дедлайны задания
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShift({ taskIds: [openTask.id] })}
            >
              <CalendarArrowUp /> Сдвинуть
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
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-32">
            <h2 className="mb-3 text-xl font-semibold tracking-tight">
              {openTask.title}
            </h2>
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
