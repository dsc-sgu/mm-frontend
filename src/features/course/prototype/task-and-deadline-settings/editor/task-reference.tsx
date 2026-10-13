// PROTOTYPE (#181): variant C — a Task Reference in the Course Page editor
// with deadline chips per Student Group, edited in popovers and applied
// apart from the Course Draft Snapshot. Only explicit values get their own
// chip; inheriting groups share one, so the card stays quiet.
import { useEffect, useState } from 'react';
import { useEditorRef } from 'platejs/react';
import {
  ChevronLeft,
  CircleAlert,
  Clock,
  Settings2,
  UserRound,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import {
  createEmptyPlateBlock,
  insertBlockBelowById,
} from '@/features/course/features/page-edit/model/block-operations';
import { studentName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  findOverride,
  overrideKey,
  type DeadlineCommand,
  type OverrideTarget,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  STUDENT_GROUPS,
  STUDENTS,
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { formatCompactMoment } from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { DeadlineText } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { LevelEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/level-editor';
import { OpeningEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/opening-time-field';
import { ValuePopover } from '@/features/course/prototype/task-and-deadline-settings/ui/value-popover';
import { insertAfterTask, NEW_TASK_ID, takeCarry } from './new-task';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));

const CHIP_TONE = {
  task: 'border-foreground/20 bg-background font-medium',
  group: 'border-sky-500/40 bg-sky-500/10',
  student: 'border-violet-500/40 bg-violet-500/10',
  quiet: 'border-dashed border-border text-muted-foreground',
} as const;

/** Inheriting groups: pick one, then give it its own value. */
function InheritingGroups({
  taskId,
  label,
  groupIds,
  onCommands,
}: {
  taskId: string;
  label: string;
  groupIds: string[];
  onCommands: (what: string) => (commands: DeadlineCommand[]) => void;
}) {
  const schedule = useViewSchedule();
  const [editing, setEditing] = useState<string | null>(null);
  const task = schedule.tasks[taskId]!;

  if (editing) {
    const group = STUDENT_GROUPS.find((item) => item.id === editing)!;
    const target: OverrideTarget = { kind: 'group', groupId: editing };
    const override = findOverride(schedule, taskId, target);
    return (
      <>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> {group.name}
        </button>
        <LevelEditor
          taskId={taskId}
          target={target}
          value={override?.value ?? { kind: 'inherit' }}
          inherited={task.deadline}
          reason={override?.reason}
          onCommands={onCommands(`группа ${group.name}`)}
        />
      </>
    );
  }

  return (
    <div className="-mx-1 grid">
      <p className="px-1 pb-1 text-xs text-muted-foreground">
        Эти группы получают общий дедлайн {label}. Выберите группу, чтобы задать
        ей свой.
      </p>
      {groupIds.map((groupId) => (
        <button
          key={groupId}
          type="button"
          onClick={() => setEditing(groupId)}
          className="flex h-8 items-center justify-between rounded-md px-2 text-sm hover:bg-muted"
        >
          {STUDENT_GROUPS.find((group) => group.id === groupId)?.name}
          <DeadlineText
            compact
            value={{ kind: 'inherit' }}
            inherited={task.deadline}
          />
        </button>
      ))}
    </div>
  );
}

export function EditorTaskReference({
  taskId,
  blockId,
  selected,
  onOpenPanel,
}: {
  taskId: string;
  blockId: string;
  selected: boolean;
  onOpenPanel: (taskId: string) => void;
}) {
  const editor = useEditorRef();
  const resolvedId = taskId === NEW_TASK_ID ? blockId : taskId;
  const task = useSandbox((state) => state.tasks[resolvedId]);
  const courseAccess = useSandbox((state) => state.courseAccess);
  const createTask = useSandbox((state) => state.createTask);
  const dropPending = useSandbox((state) => state.dropPending);
  const group = useSandbox((state) =>
    state.taskGroups.find((item) => item.id === task?.groupId)
  );
  const schedule = useViewSchedule();
  const edit = useScheduleEdit();
  const { keys } = usePendingChanges();

  // A freshly inserted Task Reference creates its Task and opens the panel.
  useEffect(() => {
    if (
      taskId === NEW_TASK_ID &&
      courseAccess === 'draft' &&
      !useSandbox.getState().tasks[blockId]
    ) {
      createTask(blockId, takeCarry());
      onOpenPanel(blockId);
    }
  }, [blockId, courseAccess, createTask, onOpenPanel, taskId]);

  useEffect(() => {
    insertAfterTask.set(resolvedId, () => {
      insertBlockBelowById(
        editor,
        blockId,
        createEmptyPlateBlock({ type: 'assignment', taskId: NEW_TASK_ID })
      );
    });
    return () => {
      insertAfterTask.delete(resolvedId);
    };
  }, [blockId, editor, resolvedId]);

  if (!task) {
    return (
      <div className="flex gap-2 rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-4 text-sm">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        {courseAccess === 'open'
          ? 'Course открыт, новые Task не создаются (#180). Удалите блок или переведите Course в draft в «Песочнице».'
          : 'Task создаётся…'}
      </div>
    );
  }

  const taskSchedule = schedule.tasks[resolvedId]!;
  const label = task.title || 'Новая Task';
  const emit = (what: string) => (commands: DeadlineCommand[]) =>
    edit(commands, `${label}: ${what}`);
  const revert = (key: string) => () => dropPending(new Set([key]));
  const personal = schedule.overrides.filter(
    (item) => item.taskId === resolvedId && item.target.kind === 'student'
  );
  const inheriting = STUDENT_GROUPS.filter(
    (item) =>
      !findOverride(schedule, resolvedId, { kind: 'group', groupId: item.id })
  ).map((item) => item.id);

  return (
    <div
      id={`task-ref-${resolvedId}`}
      className={cn(
        'rounded-xl border bg-card p-4 md:rounded-2xl md:p-5',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Задание в группе «{group?.title}»
          </p>
          <p className="text-lg font-semibold text-foreground">{label}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenPanel(resolvedId)}
        >
          <Settings2 /> Настроить
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ValuePopover
          variant="chip"
          className={CHIP_TONE.task}
          title={`${label}: общий дедлайн`}
          pending={keys.has(`${resolvedId}|task`)}
          onRevert={revert(`${resolvedId}|task`)}
          trigger={
            <>
              Дедлайн
              <DeadlineText compact value={taskSchedule.deadline} />
            </>
          }
        >
          <LevelEditor
            taskId={resolvedId}
            value={taskSchedule.deadline}
            onCommands={emit('общий дедлайн')}
          />
        </ValuePopover>

        {STUDENT_GROUPS.filter((item) => !inheriting.includes(item.id)).map(
          (studentGroup) => {
            const target: OverrideTarget = {
              kind: 'group',
              groupId: studentGroup.id,
            };
            const override = findOverride(schedule, resolvedId, target)!;
            const key = overrideKey(resolvedId, target);

            return (
              <ValuePopover
                key={studentGroup.id}
                variant="chip"
                className={CHIP_TONE.group}
                title={`${label}: ${studentGroup.name}`}
                pending={keys.has(key)}
                onRevert={revert(key)}
                trigger={
                  <>
                    {studentGroup.name}
                    <DeadlineText compact value={override.value} />
                  </>
                }
              >
                <LevelEditor
                  taskId={resolvedId}
                  target={target}
                  value={override.value}
                  inherited={taskSchedule.deadline}
                  reason={override.reason}
                  onCommands={emit(`группа ${studentGroup.name}`)}
                />
              </ValuePopover>
            );
          }
        )}

        {inheriting.length > 0 ? (
          <ValuePopover
            variant="chip"
            className={CHIP_TONE.quiet}
            title={`${label}: группы с общим дедлайном`}
            pending={inheriting.some((groupId) =>
              keys.has(`${resolvedId}|g:${groupId}`)
            )}
            trigger={
              inheriting.length === STUDENT_GROUPS.length
                ? 'Все группы с общим дедлайном'
                : `Ещё ${inheriting.length} с общим дедлайном`
            }
          >
            <InheritingGroups
              taskId={resolvedId}
              label={
                taskSchedule.deadline.kind === 'at'
                  ? formatCompactMoment(taskSchedule.deadline.at)
                  : '(без дедлайна)'
              }
              groupIds={inheriting}
              onCommands={emit}
            />
          </ValuePopover>
        ) : null}

        <ValuePopover
          variant="chip"
          className={personal.length ? CHIP_TONE.student : CHIP_TONE.quiet}
          title={`${label}: личные переопределения`}
          showZone={personal.length > 0}
          pending={personal.some((item) =>
            keys.has(overrideKey(resolvedId, item.target))
          )}
          trigger={
            <>
              <UserRound className="size-3" />
              {personal.length || 'нет'}
            </>
          }
        >
          {personal.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Личных переопределений нет. Добавить их можно на экране дедлайнов
              или в панели Task.
            </p>
          ) : (
            <ul className="-mx-1 grid">
              {personal.map((item) => {
                if (item.target.kind !== 'student') {
                  return null;
                }
                const student = studentsById.get(item.target.studentId)!;
                return (
                  <li
                    key={student.id}
                    className="flex h-8 items-center justify-between gap-2 px-1 text-sm"
                  >
                    <span className="truncate">{studentName(student)}</span>
                    <DeadlineText compact value={item.value} />
                  </li>
                );
              })}
              <li className="px-1 pt-1 text-xs text-muted-foreground">
                Правка — в панели Task или на экране дедлайнов
              </li>
            </ul>
          )}
        </ValuePopover>

        <ValuePopover
          variant="chip"
          className={CHIP_TONE.quiet}
          title={`${label}: время открытия`}
          pending={keys.has(`${resolvedId}|opening`)}
          onRevert={revert(`${resolvedId}|opening`)}
          trigger={
            <>
              <Clock className="size-3" />
              {taskSchedule.openingTime === null
                ? 'открыта сразу'
                : formatCompactMoment(taskSchedule.openingTime, '00:00')}
            </>
          }
        >
          <OpeningEditor taskId={resolvedId} onCommands={emit('открытие')} />
        </ValuePopover>
      </div>
    </div>
  );
}
