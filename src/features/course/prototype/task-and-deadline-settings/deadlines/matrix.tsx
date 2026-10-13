// PROTOTYPE (#181): variant A — section «Дедлайны» as a matrix «Task × Student
// Group», styled after Airtable / Vanta grids: hairline cells edited in
// popovers, collapsible Task Groups, personal overrides folding out of a
// counter, and a Student column with Effective Deadline and its source.
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import {
  CalendarArrowUp,
  CalendarPlus,
  ChevronRight,
  Info,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
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
  overrideKey,
  type DeadlineCommand,
  type OverrideTarget,
  type Schedule,
  type Student,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  ATTEMPTS,
  STUDENT_GROUPS,
  STUDENTS,
  useOrderedTasks,
  useSandbox,
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
  SourceBadge,
} from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { LevelEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/level-editor';
import { OpeningEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/opening-time-field';
import {
  plural,
  upcomingForGroup,
} from '@/features/course/prototype/task-and-deadline-settings/ui/shift/model';
import { StudentPicker } from '@/features/course/prototype/task-and-deadline-settings/ui/student-picker';
import { ValuePopover } from '@/features/course/prototype/task-and-deadline-settings/ui/value-popover';
import type { DeadlinesViewProps } from './page';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));
const groupName = (groupId: string) =>
  STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;

type Emit = (label: string) => (commands: DeadlineCommand[]) => void;

/**
 * «Дедлайны студента»: adds a column with one Student's deadline per Task
 * and where it comes from. Sits in the page header next to the actions.
 */
export function StudentColumnControl({
  studentId,
  onChange,
}: {
  studentId: string | null;
  onChange: (studentId: string | null) => void;
}) {
  const student = studentId ? studentsById.get(studentId) : undefined;

  return student ? (
    <span
      title="Колонка справа: дедлайн студента по каждому заданию и откуда он взялся. Заголовок колонки продлевает ему дедлайны"
      className="inline-flex h-8 items-center gap-2 rounded-md border border-violet-500/40 bg-violet-500/10 pr-1 pl-2.5 text-sm"
    >
      {studentName(student)}, {groupName(student.groupId)}
      <button
        type="button"
        aria-label="Убрать колонку студента"
        onClick={() => onChange(null)}
        className="grid size-6 cursor-pointer place-items-center rounded hover:bg-violet-500/15"
      >
        <X className="size-3.5" />
      </button>
    </span>
  ) : (
    <StudentPicker
      onPick={onChange}
      trigger={
        <Button variant="outline" size="sm">
          <Search /> Дедлайны студента
        </Button>
      }
    />
  );
}

export function MatrixView({
  selection,
  setSelection,
  studentId,
  onShift,
  onExtend,
}: DeadlinesViewProps) {
  const { task: focusTaskId } = usePrototypeSettings();
  const groups = useOrderedTasks();
  const schedule = useViewSchedule();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(focusTaskId ? [focusTaskId] : [])
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const student = studentId ? studentsById.get(studentId) : undefined;

  useEffect(() => {
    if (focusTaskId) {
      document
        .getElementById(`matrix-row-${focusTaskId}`)
        ?.scrollIntoView({ block: 'center' });
    }
  }, [focusTaskId]);

  const columns = 6 + STUDENT_GROUPS.length + (student ? 1 : 0);

  function toggleIn(set: ReadonlySet<string>, id: string) {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  }

  function select(taskIds: string[], on: boolean) {
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
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[66rem] border-collapse text-sm">
          <thead>
            <TooltipProvider delayDuration={300} disableHoverableContent>
              <tr className="border-b bg-muted text-left text-xs text-muted-foreground">
                <th className="w-10 py-2.5 pl-3" />
                <th className="sticky left-0 z-10 min-w-60 bg-muted py-2.5 pr-3 font-medium">
                  Задание
                </th>
                <th className="border-l px-2.5 py-2.5 font-medium">Открытие</th>
                <th className="border-l px-2.5 py-2.5 font-medium text-foreground">
                  Общий дедлайн
                </th>
                {STUDENT_GROUPS.map((group) => (
                  <th key={group.id} className="border-l p-0 font-medium">
                    <HeaderAction
                      hint={
                        selection.size
                          ? `Сдвинуть дедлайны ${group.name} по выбранным заданиям: ${selection.size}`
                          : `Сдвинуть дедлайны ${group.name} по предстоящим заданиям`
                      }
                      icon={<CalendarArrowUp />}
                      onClick={() =>
                        onShift({
                          taskIds: selection.size
                            ? [...selection]
                            : upcomingForGroup(
                                schedule,
                                groups.flatMap(({ tasks }) =>
                                  tasks.map((task) => task.id)
                                ),
                                group.id
                              ),
                          groupIds: [group.id],
                        })
                      }
                    >
                      {group.name}
                    </HeaderAction>
                  </th>
                ))}
                <th className="border-l px-2.5 py-2.5 font-medium">Личные</th>
                {student ? (
                  <th className="border-l bg-violet-500/5 p-0 font-medium text-violet-800 dark:text-violet-300">
                    <HeaderAction
                      tone="student"
                      hint={`Продлить дедлайны: ${studentName(student)}`}
                      icon={<CalendarPlus />}
                      onClick={() =>
                        onExtend({
                          taskIds: [...selection],
                          studentIds: [student.id],
                        })
                      }
                    >
                      {studentName(student)}
                    </HeaderAction>
                  </th>
                ) : null}
                <th className="w-px" />
              </tr>
            </TooltipProvider>
          </thead>
          <tbody>
            {groups.map(({ group, tasks }) => {
              const isCollapsed = collapsed.has(group.id);
              const allSelected = tasks.every((task) => selection.has(task.id));

              return (
                <Fragment key={group.id}>
                  <tr className="border-b bg-muted/20">
                    <td className="py-2 pl-3">
                      <Checkbox
                        aria-label={`Выбрать все задания группы «${group.title}»`}
                        checked={allSelected}
                        onCheckedChange={() =>
                          select(
                            tasks.map((task) => task.id),
                            !allSelected
                          )
                        }
                      />
                    </td>
                    <td colSpan={columns - 1} className="sticky left-0 py-1">
                      <button
                        type="button"
                        aria-expanded={!isCollapsed}
                        onClick={() =>
                          setCollapsed(toggleIn(collapsed, group.id))
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-md pr-2 font-medium hover:bg-muted"
                      >
                        <ChevronRight
                          className={cn(
                            'size-4 text-muted-foreground transition-transform',
                            !isCollapsed && 'rotate-90'
                          )}
                        />
                        {group.title}
                        <span className="font-normal text-muted-foreground">
                          {tasks.length}{' '}
                          {plural(
                            tasks.length,
                            'задание',
                            'задания',
                            'заданий'
                          )}{' '}
                          в порядке выполнения
                        </span>
                      </button>
                    </td>
                  </tr>
                  {isCollapsed
                    ? null
                    : tasks.map((task) => (
                        <TaskRows
                          key={task.id}
                          task={task}
                          student={student}
                          focused={task.id === focusTaskId}
                          selected={selection.has(task.id)}
                          onSelect={(on) => select([task.id], on)}
                          expanded={expanded.has(task.id)}
                          onToggleExpanded={() =>
                            setExpanded(toggleIn(expanded, task.id))
                          }
                          columns={columns}
                        />
                      ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** A column header that opens a window for the whole column. */
function HeaderAction({
  hint,
  icon,
  tone = 'group',
  onClick,
  children,
}: {
  hint: string;
  icon: ReactNode;
  tone?: 'group' | 'student';
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'group/head flex w-full cursor-pointer items-center justify-between gap-1.5 px-2.5 py-2.5 text-left',
            'transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
            tone === 'group'
              ? 'hover:bg-background/70 hover:text-foreground'
              : 'hover:bg-violet-500/10'
          )}
        >
          {children}
          <span className="opacity-40 transition-opacity group-hover/head:opacity-100">
            {icon}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-none whitespace-nowrap">
        {hint}
      </TooltipContent>
    </Tooltip>
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
  columns,
}: {
  task: Task;
  student: Student | undefined;
  focused: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  columns: number;
}) {
  const schedule = useViewSchedule();
  const edit = useScheduleEdit();
  const { keys } = usePendingChanges();
  const dropPending = useSandbox((state) => state.dropPending);
  const taskSchedule = schedule.tasks[task.id]!;
  const personal = schedule.overrides.filter(
    (item) => item.taskId === task.id && item.target.kind === 'student'
  );
  const emit: Emit = (label) => (commands) =>
    edit(commands, `${task.title}: ${label}`);
  const revert = (key: string) => () => dropPending(new Set([key]));
  const personalPending = personal.some((item) =>
    keys.has(overrideKey(task.id, item.target))
  );
  // Opaque tints: the sticky Task cell must hide what scrolls under it.
  const rowTone = focused
    ? 'bg-[color-mix(in_oklab,var(--color-sky-500)_8%,var(--card))]'
    : selected
      ? 'bg-[color-mix(in_oklab,var(--primary)_5%,var(--card))]'
      : 'bg-card';

  return (
    <>
      <tr
        id={`matrix-row-${task.id}`}
        className={cn('group/row border-b', rowTone)}
      >
        <td className="pl-3">
          <Checkbox
            aria-label={`Выбрать ${task.title}`}
            checked={selected}
            onCheckedChange={(value) => onSelect(value === true)}
          />
        </td>
        <td className={cn('sticky left-0 z-[1] py-1.5 pr-3', rowTone)}>
          <div className="max-w-64 truncate">{task.title}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {task.key}
          </div>
        </td>
        <td className="h-px border-l p-0">
          <ValuePopover
            variant="cell"
            title={`${task.title}: время открытия`}
            pending={keys.has(`${task.id}|opening`)}
            onRevert={revert(`${task.id}|opening`)}
            trigger={
              taskSchedule.openingTime === null ? (
                <span className="text-muted-foreground/60">сразу</span>
              ) : (
                <span className="text-muted-foreground tabular-nums">
                  {formatCompactMoment(taskSchedule.openingTime, '00:00')}
                </span>
              )
            }
          >
            <OpeningEditor taskId={task.id} onCommands={emit('открытие')} />
          </ValuePopover>
        </td>
        <td className="h-px border-l p-0">
          <ValuePopover
            variant="cell"
            title={`${task.title}: общий дедлайн`}
            pending={keys.has(`${task.id}|task`)}
            onRevert={revert(`${task.id}|task`)}
            trigger={<DeadlineText value={taskSchedule.deadline} compact />}
          >
            <LevelEditor
              taskId={task.id}
              value={taskSchedule.deadline}
              onCommands={emit('общий дедлайн')}
            />
          </ValuePopover>
        </td>
        {STUDENT_GROUPS.map((group) => {
          const target: OverrideTarget = { kind: 'group', groupId: group.id };
          const override = findOverride(schedule, task.id, target);
          const key = overrideKey(task.id, target);

          return (
            <td key={group.id} className="h-px border-l p-0">
              <ValuePopover
                variant="cell"
                title={`${task.title}: ${group.name}`}
                pending={keys.has(key)}
                onRevert={revert(key)}
                trigger={
                  <>
                    <DeadlineText
                      value={override?.value ?? { kind: 'inherit' }}
                      inherited={taskSchedule.deadline}
                      compact
                    />
                    {override?.reason ? (
                      <span title={override.reason}>
                        <Info className="size-3.5 text-muted-foreground" />
                      </span>
                    ) : null}
                  </>
                }
              >
                <LevelEditor
                  taskId={task.id}
                  target={target}
                  value={override?.value ?? { kind: 'inherit' }}
                  inherited={taskSchedule.deadline}
                  reason={override?.reason}
                  onCommands={emit(`группа ${group.name}`)}
                />
              </ValuePopover>
            </td>
          );
        })}
        <td className="h-px border-l p-0">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggleExpanded}
            className={cn(
              'flex h-full min-h-10 w-full items-center gap-1 px-2.5 text-sm hover:bg-muted',
              personal.length === 0 && 'text-muted-foreground/60',
              personalPending &&
                'bg-amber-500/10 shadow-[inset_2px_0_0_#f59e0b]'
            )}
          >
            <ChevronRight
              className={cn(
                'size-3.5 text-muted-foreground transition-transform',
                expanded && 'rotate-90'
              )}
            />
            {personal.length === 0 ? 'нет' : personal.length}
          </button>
        </td>
        {student ? (
          <td className="border-l bg-violet-500/5 px-2.5">
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
        <tr className="border-b bg-muted/30">
          <td />
          <td colSpan={columns - 1} className="py-3 pr-3">
            <PersonalList
              taskId={task.id}
              taskTitle={task.title}
              schedule={schedule}
              emit={emit}
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
  schedule: Schedule;
}) {
  const resolved = effectiveDeadline(schedule, taskId, student);
  const attempt = ATTEMPTS.find(
    (item) => item.taskId === taskId && item.studentId === student.id
  );
  const status = attempt ? lateness(attempt.submittedAt, resolved.value) : null;

  return (
    <span className="grid gap-0.5 py-1.5" title={resolved.reason || undefined}>
      <span className="flex items-center gap-1.5">
        <DeadlineText value={resolved.value} compact />
        <SourceBadge source={resolved.source} />
      </span>
      {status ? (
        <span
          className={cn(
            'text-xs',
            status.kind === 'late'
              ? 'text-red-700 dark:text-red-300'
              : 'text-muted-foreground'
          )}
        >
          {status.kind === 'late'
            ? `Сдано с опозданием ${formatDuration(status.by)}`
            : 'Сдано вовремя'}
        </span>
      ) : null}
    </span>
  );
}

function PersonalList({
  taskId,
  taskTitle,
  schedule,
  emit,
}: {
  taskId: string;
  taskTitle: string;
  schedule: Schedule;
  emit: Emit;
}) {
  const { keys } = usePendingChanges();
  const dropPending = useSandbox((state) => state.dropPending);
  const personal = schedule.overrides.filter(
    (item) => item.taskId === taskId && item.target.kind === 'student'
  );

  return (
    <div className="grid max-w-3xl gap-1">
      {personal.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Личных переопределений нет: каждый студент получает дедлайн своей
          группы.
        </p>
      ) : null}
      {personal.map((item) => {
        if (item.target.kind !== 'student') {
          return null;
        }

        const student = studentsById.get(item.target.studentId)!;
        const group = groupDeadline(schedule, taskId, student.groupId);
        const key = overrideKey(taskId, item.target);
        const label = `личное, ${studentName(student)}`;

        return (
          <div
            key={student.id}
            className="grid grid-cols-[12rem_10rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-background px-3 py-1"
          >
            <span className="truncate">
              {studentName(student)}{' '}
              <span className="text-xs text-muted-foreground">
                {groupName(student.groupId)}
              </span>
            </span>
            <ValuePopover
              title={`${taskTitle}: ${studentName(student)}`}
              pending={keys.has(key)}
              onRevert={() => dropPending(new Set([key]))}
              trigger={<DeadlineText value={item.value} compact />}
            >
              <LevelEditor
                taskId={taskId}
                target={item.target}
                value={item.value}
                inherited={group.value}
                reason={item.reason}
                inheritLabel="Как у группы"
                onCommands={emit(label)}
              />
            </ValuePopover>
            <span className="truncate text-xs text-muted-foreground">
              {item.reason || 'Без причины'}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Снять: ${studentName(student)}`}
              onClick={() =>
                emit(`снято ${label}`)([
                  { type: 'reset-override', taskId, target: item.target },
                ])
              }
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <div>
        <StudentPicker
          excludeIds={personal.map((item) =>
            item.target.kind === 'student' ? item.target.studentId : ''
          )}
          onPick={(studentId) => {
            const picked = studentsById.get(studentId)!;
            const current = effectiveDeadline(schedule, taskId, picked);
            emit(`личное, ${studentName(picked)}`)([
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
            <Button variant="ghost" size="sm">
              <Plus /> Личное переопределение
            </Button>
          }
        />
      </div>
    </div>
  );
}
