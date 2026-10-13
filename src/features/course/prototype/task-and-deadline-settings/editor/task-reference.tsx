// PROTOTYPE (#181): variant C — a Task Reference in the Course Page editor
// with deadline chips per Student Group, edited in popovers and applied
// apart from the Course Draft Snapshot.
import { useEffect, type ReactNode } from 'react';
import { useEditorRef } from 'platejs/react';
import {
  Ban,
  CircleAlert,
  Clock,
  Settings2,
  Trophy,
  UserRound,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import {
  createEmptyPlateBlock,
  insertBlockBelowById,
} from '@/features/course/features/page-edit/model/block-operations';
import { studentName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  findOverride,
  groupDeadline,
  type DeadlineValue,
  type OverrideTarget,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  STUDENT_GROUPS,
  STUDENTS,
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatCompactMoment,
  timeZoneLabel,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { LevelEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/level-editor';
import { OpeningTimeField } from '@/features/course/prototype/task-and-deadline-settings/ui/opening-time-field';
import { insertAfterTask, NEW_TASK_ID, takeCarry } from './new-task';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));

function Chip({
  label,
  value,
  inherited,
  pending,
  tone,
  title,
  children,
}: {
  label: ReactNode;
  value: DeadlineValue | { kind: 'inherit' } | null;
  inherited?: DeadlineValue;
  pending: boolean;
  tone: 'task' | 'group' | 'student' | 'opening';
  title: string;
  children: ReactNode;
}) {
  const shown = value?.kind === 'inherit' ? inherited : value;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs whitespace-nowrap',
            'transition-colors hover:bg-muted',
            value?.kind === 'inherit'
              ? 'border-dashed border-border text-muted-foreground/70'
              : tone === 'task'
                ? 'border-primary/40 bg-primary/5 font-medium'
                : tone === 'group'
                  ? 'border-sky-500/40 bg-sky-500/10'
                  : tone === 'student'
                    ? 'border-violet-500/40 bg-violet-500/10'
                    : 'border-border',
            pending && 'ring-2 ring-amber-500/70'
          )}
        >
          <span className="font-medium">{label}</span>
          {shown === undefined || shown === null ? null : shown.kind ===
            'none' ? (
            <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-300">
              <Ban className="size-3" /> без срока
            </span>
          ) : (
            <span className="tabular-nums">
              {formatCompactMoment(
                shown.at,
                tone === 'opening' ? '00:00' : '23:59'
              )}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="mb-2 text-sm font-semibold">{title}</p>
        {children}
      </PopoverContent>
    </Popover>
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
          ? 'Course открыт: новые Task не создаются (#180). Удалите этот блок или переведите Course в draft в песочнице.'
          : 'Task создаётся…'}
      </div>
    );
  }

  const taskSchedule = schedule.tasks[resolvedId]!;
  const label = task.title || 'Новая Task';
  const emit = (what: string) => (commands: Parameters<typeof edit>[0]) =>
    edit(commands, `${label}: ${what}`);
  const personal = schedule.overrides.filter(
    (item) => item.taskId === resolvedId && item.target.kind === 'student'
  );

  return (
    <div
      id={`task-ref-${resolvedId}`}
      className={cn(
        'rounded-xl border bg-primary/3 p-4 md:rounded-2xl md:p-5',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-black/10',
        'dark:border-white/10'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium text-primary">
            <Trophy className="size-4" aria-hidden="true" />
            Задание
            <span className="text-xs font-normal text-muted-foreground">
              {group?.title} ·{' '}
              <span className="font-mono">{task.key || '—'}</span>
            </span>
          </div>
          <div className="text-lg font-semibold text-foreground">{label}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenPanel(resolvedId)}
        >
          <Settings2 /> Настроить Task
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip
          label="Все"
          tone="task"
          value={taskSchedule.deadline}
          pending={keys.has(`${resolvedId}|task`)}
          title={`${label}: общий срок`}
        >
          <LevelEditor
            taskId={resolvedId}
            value={taskSchedule.deadline}
            onCommands={emit('общий срок')}
          />
        </Chip>
        {STUDENT_GROUPS.map((studentGroup) => {
          const target: OverrideTarget = {
            kind: 'group',
            groupId: studentGroup.id,
          };
          const override = findOverride(schedule, resolvedId, target);
          return (
            <Chip
              key={studentGroup.id}
              label={studentGroup.name}
              tone="group"
              value={override?.value ?? { kind: 'inherit' }}
              inherited={taskSchedule.deadline}
              pending={keys.has(`${resolvedId}|g:${studentGroup.id}`)}
              title={`${label}: ${studentGroup.name}${override?.reason ? ` — ${override.reason}` : ''}`}
            >
              <LevelEditor
                taskId={resolvedId}
                target={target}
                value={override?.value ?? { kind: 'inherit' }}
                inherited={taskSchedule.deadline}
                reason={override?.reason}
                inheritLabel="Общий срок"
                onCommands={emit(`группа ${studentGroup.name}`)}
              />
            </Chip>
          );
        })}
        <Chip
          label={
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" /> {personal.length}
            </span>
          }
          tone="student"
          value={null}
          pending={personal.some((item) =>
            keys.has(
              `${resolvedId}|s:${item.target.kind === 'student' ? item.target.studentId : ''}`
            )
          )}
          title={`${label}: личные переопределения`}
        >
          {personal.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Нет. Добавить можно на экране сроков или в панели Task.
            </p>
          ) : (
            <ul className="grid max-h-72 gap-3 overflow-y-auto">
              {personal.map((item) => {
                if (item.target.kind !== 'student') {
                  return null;
                }
                const student = studentsById.get(item.target.studentId)!;
                return (
                  <li key={student.id} className="grid gap-1">
                    <span className="text-sm font-medium">
                      {studentName(student)}
                    </span>
                    <LevelEditor
                      compact
                      taskId={resolvedId}
                      target={item.target}
                      value={item.value}
                      inherited={
                        groupDeadline(schedule, resolvedId, student.groupId)
                          .value
                      }
                      reason={item.reason}
                      inheritLabel="Срок группы"
                      onCommands={emit(`личное, ${studentName(student)}`)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Chip>
        <Chip
          label={
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> открытие
            </span>
          }
          tone="opening"
          value={
            taskSchedule.openingTime === null
              ? null
              : { kind: 'at', at: taskSchedule.openingTime }
          }
          pending={keys.has(`${resolvedId}|opening`)}
          title={`${label}: Task Opening Time`}
        >
          <OpeningTimeField taskId={resolvedId} onCommands={emit('открытие')} />
        </Chip>
        <span className="text-[11px] text-muted-foreground">
          {timeZoneLabel()} · сроки не входят в черновик курса
        </span>
      </div>
    </div>
  );
}
