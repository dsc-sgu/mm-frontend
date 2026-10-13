// PROTOTYPE (#181): variant D — Task rows on a time axis with marks for the
// Task Deadline (◆), Student Group overrides (pills), personal overrides
// (dots) and Task Opening Time (▸). Dragging a mark moves it; dragging ◆
// opens the mass shift preview for that Task (or the selected Tasks).
import { Fragment, useCallback, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { cn } from '@/shadcn/lib/utils';
import {
  studentName,
  type Task,
} from '@/features/course/prototype/task-and-deadline-settings/fixture';
import { PanelFrame } from '@/features/course/prototype/task-and-deadline-settings/panel/panel-frame';
import {
  targetKey,
  type DeadlineCommand,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  usePrototypeSettings,
  useUpdatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  STUDENT_GROUPS,
  STUDENTS,
  useOrderedTasks,
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatCompactMoment,
  formatDay,
  formatMoment,
  NOW,
  shiftDays,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { NoDeadline } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { TaskScheduleEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/task-schedule-editor';
import type { DeadlinesViewProps } from './page';

const DAY = 24 * 60 * 60 * 1000;
const DAY_PX = 12;
const RANGE_START = new Date(2026, 8, 1).getTime();
const RANGE_END = new Date(2027, 0, 1).getTime();
const WIDTH = Math.round((RANGE_END - RANGE_START) / DAY) * DAY_PX;
const ROW = 'h-[4.5rem]';
const GROUP_ROW = 'h-10';

const x = (at: number) => ((at - RANGE_START) / DAY) * DAY_PX;

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));
const groupName = (groupId: string) =>
  STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;

const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long' });

type DragState = { id: string; days: number } | null;

function DraggableMark({
  id,
  at,
  label,
  title,
  className,
  style,
  drag,
  setDrag,
  onDrop,
  onClick,
  children,
}: {
  id: string;
  at: number;
  label: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
  drag: DragState;
  setDrag: (drag: DragState) => void;
  onDrop: (days: number) => void;
  onClick: () => void;
  children: ReactNode;
}) {
  const start = useRef<number | null>(null);
  const moved = useRef(false);
  const days = drag?.id === id ? drag.days : 0;

  return (
    <button
      type="button"
      title={`${title}\nТащите, чтобы сдвинуть`}
      aria-label={`${label}: ${title}`}
      onPointerDown={(event) => {
        start.current = event.clientX;
        moved.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (start.current === null) {
          return;
        }

        const dx = event.clientX - start.current;
        if (Math.abs(dx) > 3) {
          moved.current = true;
        }
        setDrag({ id, days: Math.round(dx / DAY_PX) });
      }}
      onPointerUp={() => {
        start.current = null;
        setDrag(null);
        if (!moved.current) {
          onClick();
        } else if (days !== 0) {
          onDrop(days);
        }
      }}
      onPointerCancel={() => {
        start.current = null;
        setDrag(null);
      }}
      className={cn(
        'absolute z-10 -translate-x-1/2 cursor-grab touch-none active:cursor-grabbing',
        className
      )}
      style={{ ...style, left: x(at) + days * DAY_PX }}
    >
      {children}
      {days !== 0 ? (
        <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[11px] whitespace-nowrap text-background">
          {days > 0 ? `+${days}` : days} д → {formatMoment(shiftDays(at, days))}
        </span>
      ) : null}
    </button>
  );
}

export function TimelineView({
  selection,
  setSelection,
  onShift,
}: DeadlinesViewProps) {
  const { task: openTaskId } = usePrototypeSettings();
  const update = useUpdatePrototypeSearch();
  const tasks = useSandbox((state) => state.tasks);
  const groups = useOrderedTasks();
  const [drag, setDrag] = useState<DragState>(null);
  const openTask = openTaskId ? tasks[openTaskId] : undefined;
  const close = useCallback(() => update({ task: undefined }), [update]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  function toggleGroup(groupId: string) {
    const next = new Set(collapsed);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    setCollapsed(next);
  }

  const months: { label: string; left: number; width: number }[] = [];
  for (
    let cursor = new Date(RANGE_START);
    cursor.getTime() < RANGE_END;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    months.push({
      label: monthFormat
        .format(cursor)
        .replace(/^./, (char) => char.toUpperCase()),
      left: x(cursor.getTime()),
      width: x(Math.min(next.getTime(), RANGE_END)) - x(cursor.getTime()),
    });
  }

  const mondays: number[] = [];
  const saturdays: number[] = [];
  for (let at = RANGE_START; at < RANGE_END; at = shiftDays(at, 1)) {
    const day = new Date(at).getDay();
    if (day === 1) {
      mondays.push(at);
    }
    if (day === 6) {
      saturdays.push(at);
    }
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        Перетащите ◆, чтобы сдвинуть Task целиком (или все выбранные) с
        предпросмотром. Отметки групп, Students и ▸ открытия двигаются сразу.
        Группы без отметки наследуют ◆.
      </p>
      <div className="flex overflow-hidden rounded-xl border bg-card">
        <div className="w-64 shrink-0 border-r">
          <div className="h-12 border-b bg-muted/40" />
          {groups.map(({ group, tasks: items }) => (
            <Fragment key={group.id}>
              <button
                type="button"
                aria-expanded={!collapsed.has(group.id)}
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  GROUP_ROW,
                  'flex w-full items-center gap-1.5 border-b bg-muted/20 px-3 text-left text-sm font-medium hover:bg-muted/60'
                )}
              >
                <ChevronRight
                  className={cn(
                    'size-4 text-muted-foreground transition-transform',
                    !collapsed.has(group.id) && 'rotate-90'
                  )}
                />
                {group.title}
                <span className="font-normal text-muted-foreground">
                  {items.length}
                </span>
              </button>
              {collapsed.has(group.id)
                ? null
                : items.map((task) => (
                    <TaskTitleCell
                      key={task.id}
                      task={task}
                      selected={selection.has(task.id)}
                      open={task.id === openTaskId}
                      onSelect={(on) => {
                        const next = new Set(selection);
                        if (on) {
                          next.add(task.id);
                        } else {
                          next.delete(task.id);
                        }
                        setSelection(next);
                      }}
                      onOpen={() => update({ task: task.id })}
                    />
                  ))}
            </Fragment>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ width: WIDTH }}>
            {saturdays.map((at) => (
              <span
                key={at}
                className="pointer-events-none absolute top-12 bottom-0 bg-muted/50"
                style={{ left: x(at), width: DAY_PX * 2 }}
              />
            ))}
            {mondays.map((at) => (
              <span
                key={at}
                className="pointer-events-none absolute top-12 bottom-0 border-l border-border/60"
                style={{ left: x(at) }}
              />
            ))}
            <div className="relative h-12 border-b bg-muted/40">
              {months.map((month) => (
                <span
                  key={month.left}
                  className="absolute top-1.5 border-l border-border pl-1.5 text-xs font-medium"
                  style={{ left: month.left, width: month.width }}
                >
                  {month.label}
                </span>
              ))}
              {mondays.map((at) => (
                <span
                  key={at}
                  className="absolute bottom-1.5 -translate-x-1/2 text-[11px] text-muted-foreground tabular-nums"
                  style={{ left: x(at) + DAY_PX / 2 }}
                >
                  {new Date(at).getDate()}
                </span>
              ))}
              <span
                className="absolute bottom-1 z-[6] -translate-x-1/2 rounded bg-red-500 px-1.5 text-[11px] leading-4 font-medium text-white"
                style={{ left: x(NOW) }}
              >
                {formatDay(NOW)}
              </span>
            </div>
            <span
              className="pointer-events-none absolute top-12 bottom-0 z-[5] border-l border-red-500"
              style={{ left: x(NOW) }}
            />
            {groups.map(({ group, tasks: items }) => (
              <Fragment key={group.id}>
                <div className={cn(GROUP_ROW, 'border-b bg-muted/20')} />
                {collapsed.has(group.id)
                  ? null
                  : items.map((task) => (
                      <TaskTrack
                        key={task.id}
                        task={task}
                        drag={drag}
                        setDrag={setDrag}
                        onOpen={() => update({ task: task.id })}
                        onShiftTask={(days) =>
                          onShift({
                            taskIds: selection.has(task.id)
                              ? [...selection]
                              : [task.id],
                            days,
                          })
                        }
                      />
                    ))}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {openTask ? (
        <PanelFrame layout="overlay" label="Сроки Task" onEscape={close}>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-5">
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              Сроки Task
            </span>
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

function TaskTitleCell({
  task,
  selected,
  open,
  onSelect,
  onOpen,
}: {
  task: Task;
  selected: boolean;
  open: boolean;
  onSelect: (on: boolean) => void;
  onOpen: () => void;
}) {
  const schedule = useViewSchedule();
  const taskSchedule = schedule.tasks[task.id]!;
  const noneGroups = schedule.overrides.filter(
    (item) =>
      item.taskId === task.id &&
      item.target.kind === 'group' &&
      item.value.kind === 'none'
  );

  return (
    <div
      className={cn(
        ROW,
        'flex items-start gap-2.5 border-b px-3 py-2.5',
        open && 'bg-primary/6',
        selected && !open && 'bg-primary/3'
      )}
    >
      <Checkbox
        className="mt-1"
        aria-label={`Выбрать ${task.title}`}
        checked={selected}
        onCheckedChange={(value) => onSelect(value === true)}
      />
      <button
        type="button"
        onClick={onOpen}
        className="grid min-w-0 flex-1 gap-0.5 text-left"
      >
        <span className="truncate text-sm">{task.title}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {taskSchedule.deadline.kind === 'none' ? (
            <NoDeadline />
          ) : (
            formatCompactMoment(taskSchedule.deadline.at)
          )}
          {noneGroups.length > 0 ? (
            <span>
              {noneGroups
                .map((item) =>
                  item.target.kind === 'group'
                    ? groupName(item.target.groupId)
                    : ''
                )
                .join(', ')}{' '}
              без срока
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

function TaskTrack({
  task,
  drag,
  setDrag,
  onOpen,
  onShiftTask,
}: {
  task: Task;
  drag: DragState;
  setDrag: (drag: DragState) => void;
  onOpen: () => void;
  onShiftTask: (days: number) => void;
}) {
  const schedule = useViewSchedule();
  const edit = useScheduleEdit();
  const { keys } = usePendingChanges();
  const taskSchedule = schedule.tasks[task.id]!;
  const overrides = schedule.overrides.filter(
    (item) => item.taskId === task.id && item.value.kind === 'at'
  );
  const deadline =
    taskSchedule.deadline.kind === 'at' ? taskSchedule.deadline.at : null;
  const windowStart = taskSchedule.openingTime ?? RANGE_START;
  const windowEnd =
    deadline ??
    Math.max(
      ...overrides.map((item) =>
        item.value.kind === 'at' ? item.value.at : 0
      ),
      windowStart
    );

  // Student Groups with the same date share one pill.
  const groupMarks: { at: number; items: typeof overrides }[] = [];
  for (const item of overrides) {
    if (item.target.kind !== 'group' || item.value.kind !== 'at') {
      continue;
    }
    const at = item.value.at;
    const mark = groupMarks.find((entry) => entry.at === at);
    if (mark) {
      mark.items.push(item);
    } else {
      groupMarks.push({ at, items: [item] });
    }
  }
  groupMarks.sort((a, b) => a.at - b.at);
  const personalMarks = overrides.filter(
    (item) => item.target.kind === 'student'
  );

  const send = (commands: DeadlineCommand[], label: string) =>
    edit(commands, `${task.title}: ${label}`);

  return (
    <div className={cn(ROW, 'relative border-b')}>
      <span
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/10"
        style={{
          left: x(windowStart),
          width: Math.max(0, x(windowEnd) - x(windowStart)),
        }}
      />
      {taskSchedule.openingTime !== null ? (
        <DraggableMark
          id={`${task.id}|opening`}
          at={taskSchedule.openingTime}
          label="Task Opening Time"
          title={`Открытие: ${formatMoment(taskSchedule.openingTime)}`}
          drag={drag}
          setDrag={setDrag}
          onClick={onOpen}
          onDrop={(days) =>
            send(
              [
                {
                  type: 'set-opening-time',
                  taskId: task.id,
                  at: shiftDays(taskSchedule.openingTime!, days),
                },
              ],
              'открытие'
            )
          }
          className="top-1/2 -translate-y-1/2"
        >
          <span
            className={cn(
              'block size-0 border-y-[7px] border-l-[10px] border-y-transparent border-l-muted-foreground',
              keys.has(`${task.id}|opening`) && 'border-l-amber-500'
            )}
          />
        </DraggableMark>
      ) : null}

      {deadline !== null ? (
        <DraggableMark
          id={`${task.id}|task`}
          at={deadline}
          label="Общий срок"
          title={`Общий срок: ${formatMoment(deadline)}`}
          drag={drag}
          setDrag={setDrag}
          onClick={onOpen}
          onDrop={onShiftTask}
          className="top-1/2 -translate-y-1/2"
        >
          <span
            className={cn(
              'block size-3.5 rotate-45 rounded-[2px] bg-foreground',
              keys.has(`${task.id}|task`) && 'ring-2 ring-amber-500'
            )}
          />
          <span className="pointer-events-none absolute top-1/2 left-full ml-1.5 -translate-y-1/2 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
            {formatDay(deadline)}
          </span>
        </DraggableMark>
      ) : null}

      {groupMarks.map(({ at, items }, index) => {
        const id = `${task.id}|groups@${at}`;
        const names = items.map((item) =>
          item.target.kind === 'group' ? groupName(item.target.groupId) : ''
        );
        const pending = items.some((item) =>
          keys.has(`${task.id}|${targetKey(item.target)}`)
        );

        return (
          <DraggableMark
            key={id}
            id={id}
            at={at}
            label={names.join(', ')}
            title={items
              .map(
                (item, at_) =>
                  `${names[at_]}: ${formatMoment(at)}${item.reason ? ` — ${item.reason}` : ''}`
              )
              .join('\n')}
            drag={drag}
            setDrag={setDrag}
            onClick={onOpen}
            onDrop={(days) =>
              send(
                items.map((item) => ({
                  type: 'set-override',
                  taskId: task.id,
                  target: item.target,
                  value: { kind: 'at', at: shiftDays(at, days) },
                })),
                `группы ${names.join(', ')}`
              )
            }
            style={{ top: 2 + (index % 2) * 12 }}
          >
            <span
              className={cn(
                'block rounded-full bg-sky-500/90 px-1.5 text-[10px] leading-4 font-medium whitespace-nowrap text-white',
                pending && 'ring-2 ring-amber-500'
              )}
            >
              {names.map((name) => name.replace('пп', '')).join(' · ')}
            </span>
          </DraggableMark>
        );
      })}

      {personalMarks.map((item) => {
        if (item.value.kind !== 'at' || item.target.kind !== 'student') {
          return null;
        }

        const at = item.value.at;
        const target = item.target;
        const key = `${task.id}|${targetKey(target)}`;
        const student = studentsById.get(target.studentId)!;

        return (
          <DraggableMark
            key={key}
            id={key}
            at={at}
            label={studentName(student)}
            title={`${studentName(student)}, ${groupName(student.groupId)}: ${formatMoment(at)}${item.reason ? `\n${item.reason}` : ''}`}
            drag={drag}
            setDrag={setDrag}
            onClick={onOpen}
            onDrop={(days) =>
              send(
                [
                  {
                    type: 'set-override',
                    taskId: task.id,
                    target,
                    value: { kind: 'at', at: shiftDays(at, days) },
                  },
                ],
                `личное, ${studentName(student)}`
              )
            }
            className="bottom-1.5"
          >
            <span
              className={cn(
                'block size-3 rounded-full border-2 border-background bg-violet-500',
                keys.has(key) && 'ring-2 ring-amber-500'
              )}
            />
          </DraggableMark>
        );
      })}
    </div>
  );
}
