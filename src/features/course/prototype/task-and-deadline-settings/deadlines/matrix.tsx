// PROTOTYPE (#181): variant A — section «Сроки» as a matrix «Task × Student
// Group». Personal overrides fold out of a counter; a Student search adds a
// column with their Effective Deadline and its source.
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, Plus, Search, Trash2, UserRound, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import {
  studentName,
  type Task,
} from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  effectiveDeadline,
  findOverride,
  groupDeadline,
  lateness,
  type OverrideTarget,
  type Student,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  ATTEMPTS,
  STUDENT_GROUPS,
  STUDENTS,
  useOrderedTasks,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatCompactMoment,
  formatDuration,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import {
  DeadlineText,
  NoDeadline,
  SourceBadge,
} from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { LevelEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/level-editor';
import { OpeningTimeField } from '@/features/course/prototype/task-and-deadline-settings/ui/opening-time-field';
import { StudentPicker } from '@/features/course/prototype/task-and-deadline-settings/ui/student-picker';
import type { DeadlinesViewProps } from './page';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));
const groupName = (groupId: string) =>
  STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;

function CellPopover({
  trigger,
  title,
  children,
  pending,
  className,
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  pending: boolean;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative flex h-full min-h-9 w-full items-center rounded-md px-2 py-1 text-left text-sm',
            'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            pending && 'bg-amber-500/10 ring-1 ring-amber-500/60',
            className
          )}
        >
          {trigger}
          {pending ? (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500" />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="mb-2 text-sm font-semibold">{title}</p>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function MatrixView({ selection, setSelection }: DeadlinesViewProps) {
  const { task: focusTaskId } = usePrototypeSettings();
  const schedule = useViewSchedule();
  const groups = useOrderedTasks();
  const edit = useScheduleEdit();
  const { keys } = usePendingChanges();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(focusTaskId ? [focusTaskId] : [])
  );
  const [studentId, setStudentId] = useState<string | null>(null);
  const student = studentId ? studentsById.get(studentId) : undefined;

  useEffect(() => {
    if (focusTaskId) {
      document
        .getElementById(`matrix-row-${focusTaskId}`)
        ?.scrollIntoView({ block: 'center' });
    }
  }, [focusTaskId]);

  const columns = 6 + STUDENT_GROUPS.length + (student ? 1 : 0);

  function toggleExpanded(taskId: string) {
    const next = new Set(expanded);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    setExpanded(next);
  }

  function toggleSelected(taskIds: string[], on: boolean) {
    const next = new Set(selection);
    for (const taskId of taskIds) {
      if (on) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
    }
    setSelection(next);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StudentPicker
          onPick={setStudentId}
          trigger={
            <Button variant="outline" size="sm">
              <Search /> Найти Student
            </Button>
          }
        />
        {student ? (
          <span className="inline-flex items-center gap-2 rounded-md bg-violet-500/10 px-2 py-1 text-sm">
            <UserRound className="size-4 text-violet-600" />
            {studentName(student)} · {groupName(student.groupId)}
            <button
              type="button"
              aria-label="Убрать Student"
              onClick={() => setStudentId(null)}
            >
              <X className="size-4" />
            </button>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            покажет его Effective Deadline по всем Task и откуда взялся каждый
            срок
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="w-8 px-2 py-2" />
              <th className="sticky left-0 z-10 min-w-56 bg-card px-2 py-2 font-medium">
                Task
              </th>
              <th className="px-2 py-2 font-medium">Открытие</th>
              <th className="px-2 py-2 font-medium text-foreground">
                Общий срок
              </th>
              {STUDENT_GROUPS.map((group) => (
                <th key={group.id} className="px-2 py-2 font-medium">
                  {group.name}
                </th>
              ))}
              <th className="px-2 py-2 font-medium">Личные</th>
              {student ? (
                <th className="bg-violet-500/5 px-2 py-2 font-medium text-violet-700 dark:text-violet-300">
                  {studentName(student)}
                </th>
              ) : null}
              <th className="w-2" />
            </tr>
          </thead>
          <tbody>
            {groups.map(({ group, tasks }) => (
              <Fragment key={group.id}>
                <tr className="border-b bg-muted/40">
                  <td className="px-2 py-1.5">
                    <Checkbox
                      aria-label={`Выбрать все Task группы ${group.title}`}
                      checked={tasks.every((task) => selection.has(task.id))}
                      onCheckedChange={(value) =>
                        toggleSelected(
                          tasks.map((task) => task.id),
                          value === true
                        )
                      }
                    />
                  </td>
                  <td
                    colSpan={columns - 1}
                    className="sticky left-0 px-2 py-1.5 text-xs font-semibold tracking-wide uppercase"
                  >
                    {group.title}{' '}
                    <span className="font-mono font-normal tracking-normal text-muted-foreground normal-case">
                      · {group.key} · порядок выполнения
                    </span>
                  </td>
                </tr>
                {tasks.map((task) => (
                  <TaskRows
                    key={task.id}
                    task={task}
                    student={student}
                    focused={task.id === focusTaskId}
                    selected={selection.has(task.id)}
                    onSelect={(on) => toggleSelected([task.id], on)}
                    expanded={expanded.has(task.id)}
                    onToggleExpanded={() => toggleExpanded(task.id)}
                    pendingKeys={keys}
                    schedule={schedule}
                    edit={edit}
                    columns={columns}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskRows({
  task,
  student,
  focused,
  selected,
  onSelect,
  expanded,
  onToggleExpanded,
  pendingKeys,
  schedule,
  edit,
  columns,
}: {
  task: Task;
  student: Student | undefined;
  focused: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  pendingKeys: ReadonlySet<string>;
  schedule: ReturnType<typeof useViewSchedule>;
  edit: ReturnType<typeof useScheduleEdit>;
  columns: number;
}) {
  const taskSchedule = schedule.tasks[task.id]!;
  const personal = schedule.overrides.filter(
    (item) => item.taskId === task.id && item.target.kind === 'student'
  );
  const emit = (label: string) => (commands: Parameters<typeof edit>[0]) =>
    edit(commands, `${task.title}: ${label}`);

  return (
    <>
      <tr
        id={`matrix-row-${task.id}`}
        className={cn(
          'border-b align-middle',
          selected && 'bg-primary/5',
          focused && 'bg-sky-500/10'
        )}
      >
        <td className="px-2">
          <Checkbox
            aria-label={`Выбрать ${task.title}`}
            checked={selected}
            onCheckedChange={(value) => onSelect(value === true)}
          />
        </td>
        <td className="sticky left-0 bg-inherit px-2 py-1">
          <div className="max-w-64 truncate font-medium">{task.title}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {task.key}
          </div>
        </td>
        <td className="px-0.5">
          <CellPopover
            title={`${task.title}: Task Opening Time`}
            pending={pendingKeys.has(`${task.id}|opening`)}
            trigger={
              taskSchedule.openingTime === null ? (
                <span className="text-muted-foreground/60">—</span>
              ) : (
                <span className="text-muted-foreground tabular-nums">
                  {formatCompactMoment(taskSchedule.openingTime, '00:00')}
                </span>
              )
            }
          >
            <OpeningTimeField taskId={task.id} onCommands={emit('открытие')} />
          </CellPopover>
        </td>
        <td className="px-0.5">
          <CellPopover
            title={`${task.title}: общий срок`}
            pending={pendingKeys.has(`${task.id}|task`)}
            trigger={<DeadlineText value={taskSchedule.deadline} compact />}
          >
            <LevelEditor
              taskId={task.id}
              value={taskSchedule.deadline}
              onCommands={emit('общий срок')}
            />
          </CellPopover>
        </td>
        {STUDENT_GROUPS.map((group) => {
          const target: OverrideTarget = { kind: 'group', groupId: group.id };
          const override = findOverride(schedule, task.id, target);

          return (
            <td key={group.id} className="px-0.5">
              <CellPopover
                title={`${task.title}: ${group.name}`}
                pending={pendingKeys.has(`${task.id}|g:${group.id}`)}
                trigger={
                  <span
                    className="grid min-w-0"
                    title={override?.reason || undefined}
                  >
                    <DeadlineText
                      value={override?.value ?? { kind: 'inherit' }}
                      inherited={taskSchedule.deadline}
                      compact
                    />
                    {override?.reason ? (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {override.reason}
                      </span>
                    ) : null}
                  </span>
                }
              >
                <LevelEditor
                  taskId={task.id}
                  target={target}
                  value={override?.value ?? { kind: 'inherit' }}
                  inherited={taskSchedule.deadline}
                  reason={override?.reason}
                  inheritLabel="Общий срок"
                  onCommands={emit(`группа ${group.name}`)}
                />
              </CellPopover>
            </td>
          );
        })}
        <td className="px-0.5">
          <button
            type="button"
            onClick={onToggleExpanded}
            className={cn(
              'flex h-9 w-full items-center gap-1 rounded-md px-2 text-sm hover:bg-muted',
              personal.length === 0 && 'text-muted-foreground/60'
            )}
          >
            <ChevronRight
              className={cn(
                'size-3.5 transition-transform',
                expanded && 'rotate-90'
              )}
            />
            <UserRound className="size-3.5" />
            {personal.length}
            {personal.some((item) =>
              pendingKeys.has(
                `${task.id}|s:${(item.target as { studentId: string }).studentId}`
              )
            ) ? (
              <span className="ml-1 size-1.5 rounded-full bg-amber-500" />
            ) : null}
          </button>
        </td>
        {student ? (
          <td className="bg-violet-500/5 px-2">
            <StudentCell
              taskId={task.id}
              student={student}
              schedule={schedule}
            />
          </td>
        ) : null}
        <td />
      </tr>
      {expanded ? (
        <tr className="border-b bg-muted/20">
          <td />
          <td colSpan={columns - 1} className="px-2 py-2">
            <PersonalList
              taskId={task.id}
              taskTitle={task.title}
              schedule={schedule}
              pendingKeys={pendingKeys}
              onCommands={emit}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function StudentCell({
  taskId,
  student,
  schedule,
}: {
  taskId: string;
  student: Student;
  schedule: ReturnType<typeof useViewSchedule>;
}) {
  const resolved = effectiveDeadline(schedule, taskId, student);
  const attempt = ATTEMPTS.find(
    (item) => item.taskId === taskId && item.studentId === student.id
  );
  const status = attempt ? lateness(attempt.submittedAt, resolved.value) : null;

  return (
    <span className="grid gap-0.5 py-1" title={resolved.reason || undefined}>
      <span className="flex items-center gap-1.5">
        <DeadlineText value={resolved.value} compact />
        <SourceBadge source={resolved.source} />
      </span>
      {resolved.reason ? (
        <span className="max-w-48 truncate text-[11px] text-muted-foreground">
          {resolved.reason}
        </span>
      ) : null}
      {status ? (
        <span
          className={cn(
            'text-[11px]',
            status.kind === 'late'
              ? 'text-red-700 dark:text-red-300'
              : 'text-emerald-700 dark:text-emerald-300'
          )}
        >
          {status.kind === 'late'
            ? `сдано с опозданием ${formatDuration(status.by)}`
            : 'сдано вовремя'}
        </span>
      ) : null}
    </span>
  );
}

function PersonalList({
  taskId,
  taskTitle,
  schedule,
  pendingKeys,
  onCommands,
}: {
  taskId: string;
  taskTitle: string;
  schedule: ReturnType<typeof useViewSchedule>;
  pendingKeys: ReadonlySet<string>;
  onCommands: (
    label: string
  ) => (commands: Parameters<ReturnType<typeof useScheduleEdit>>[0]) => void;
}) {
  const personal = schedule.overrides.filter(
    (item) => item.taskId === taskId && item.target.kind === 'student'
  );

  return (
    <div className="grid gap-2">
      {personal.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Личных переопределений нет.
        </p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {personal.map((item) => {
            if (item.target.kind !== 'student') {
              return null;
            }

            const student = studentsById.get(item.target.studentId)!;
            const group = groupDeadline(schedule, taskId, student.groupId);
            const label = `личное, ${studentName(student)}`;

            return (
              <li
                key={student.id}
                className={cn(
                  'flex items-start gap-2 rounded-lg border bg-background px-2.5 py-1.5',
                  pendingKeys.has(`${taskId}|s:${student.id}`) &&
                    'border-amber-500/60'
                )}
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="grid min-w-0 flex-1 gap-0.5 text-left text-sm"
                    >
                      <span className="truncate">
                        <span className="font-medium">
                          {studentName(student)}
                        </span>{' '}
                        <span className="text-xs text-muted-foreground">
                          {groupName(student.groupId)}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2">
                        <DeadlineText value={item.value} compact />
                        <span className="text-[11px] text-muted-foreground">
                          группа:{' '}
                          {group.value.kind === 'at'
                            ? formatCompactMoment(group.value.at)
                            : 'без срока'}
                        </span>
                      </span>
                      {item.reason ? (
                        <span className="text-xs text-muted-foreground">
                          {item.reason}
                        </span>
                      ) : null}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80">
                    <p className="mb-2 text-sm font-semibold">
                      {taskTitle}: {studentName(student)}
                    </p>
                    <LevelEditor
                      taskId={taskId}
                      target={item.target}
                      value={item.value}
                      inherited={group.value}
                      reason={item.reason}
                      inheritLabel="Срок группы"
                      onCommands={onCommands(label)}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Снять личное переопределение"
                  onClick={() =>
                    onCommands(`снято ${label}`)([
                      { type: 'reset-override', taskId, target: item.target },
                    ])
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <StudentPicker
          excludeIds={personal.map((item) =>
            item.target.kind === 'student' ? item.target.studentId : ''
          )}
          onPick={(studentId) => {
            const student = studentsById.get(studentId)!;
            const current = effectiveDeadline(schedule, taskId, student);
            onCommands(`личное, ${studentName(student)}`)([
              {
                type: 'set-override',
                taskId,
                target: { kind: 'student', studentId },
                value: current.value,
                reason: '',
              },
            ]);
          }}
          trigger={
            <Button variant="outline" size="xs">
              <Plus /> Личное переопределение
            </Button>
          }
        />
        <span className="text-xs text-muted-foreground">
          начнётся с текущего срока Student; <NoDeadline className="ml-1" />{' '}
          тоже значение
        </span>
      </div>
    </div>
  );
}
