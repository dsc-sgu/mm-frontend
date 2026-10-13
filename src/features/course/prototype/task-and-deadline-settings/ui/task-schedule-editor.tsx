// PROTOTYPE (#181): every schedule value of one Task as property rows —
// opening time, Task Deadline, each Student Group and personal Deadline
// Overrides (the latter as a list, like Lyssna's date overrides).
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { studentName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  effectiveDeadline,
  findOverride,
  groupDeadline,
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
import { formatMoment } from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { DeadlineText } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { LevelEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/level-editor';
import {
  OpeningEditor,
  OpeningNotes,
} from '@/features/course/prototype/task-and-deadline-settings/ui/opening-time-field';
import {
  PropertyRow,
  RowsHeading,
} from '@/features/course/prototype/task-and-deadline-settings/ui/property-row';
import { StudentPicker } from '@/features/course/prototype/task-and-deadline-settings/ui/student-picker';
import { ValuePopover } from '@/features/course/prototype/task-and-deadline-settings/ui/value-popover';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));
const groupName = (groupId: string) =>
  STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;

export function PendingDot({ show }: { show: boolean }) {
  return show ? (
    <span
      title="Не применено"
      className="inline-block size-2 shrink-0 rounded-full bg-amber-500"
    />
  ) : null;
}

/** Opening time row, shared by the Task panel and the schedule editor. */
export function OpeningRow({
  taskId,
  label,
  onCommands,
}: {
  taskId: string;
  label: string;
  onCommands: (commands: DeadlineCommand[]) => void;
}) {
  const schedule = useViewSchedule();
  const { keys } = usePendingChanges();
  const dropPending = useSandbox((state) => state.dropPending);
  const opening = schedule.tasks[taskId]?.openingTime ?? null;
  const key = `${taskId}|opening`;

  return (
    <PropertyRow
      label="Открытие"
      note={<OpeningNotes taskId={taskId} quietWhenFine />}
    >
      <ValuePopover
        title={`${label}: время открытия`}
        pending={keys.has(key)}
        onRevert={() => dropPending(new Set([key]))}
        trigger={
          opening === null ? (
            <span className="text-muted-foreground">Сразу</span>
          ) : (
            <span className="tabular-nums">{formatMoment(opening)}</span>
          )
        }
      >
        <OpeningEditor taskId={taskId} onCommands={onCommands} />
      </ValuePopover>
    </PropertyRow>
  );
}

/** Task Deadline row. */
export function DeadlineRow({
  taskId,
  label,
  onCommands,
}: {
  taskId: string;
  label: string;
  onCommands: (commands: DeadlineCommand[]) => void;
}) {
  const schedule = useViewSchedule();
  const { keys } = usePendingChanges();
  const dropPending = useSandbox((state) => state.dropPending);
  const deadline = schedule.tasks[taskId]?.deadline;
  const key = `${taskId}|task`;

  if (!deadline) {
    return null;
  }

  return (
    <PropertyRow label="Общий дедлайн">
      <ValuePopover
        title={`${label}: общий дедлайн`}
        pending={keys.has(key)}
        onRevert={() => dropPending(new Set([key]))}
        trigger={<DeadlineText value={deadline} />}
      >
        <LevelEditor taskId={taskId} value={deadline} onCommands={onCommands} />
      </ValuePopover>
    </PropertyRow>
  );
}

export function TaskScheduleEditor({
  taskId,
  taskTitle,
  showOpening = true,
  showTaskDeadline = true,
}: {
  taskId: string;
  taskTitle: string;
  showOpening?: boolean;
  showTaskDeadline?: boolean;
}) {
  const schedule = useViewSchedule();
  const edit = useScheduleEdit();
  const { keys } = usePendingChanges();
  const dropPending = useSandbox((state) => state.dropPending);
  const task = schedule.tasks[taskId]!;
  const personal = schedule.overrides.filter(
    (item) => item.taskId === taskId && item.target.kind === 'student'
  );

  const emit = (what: string) => (commands: DeadlineCommand[]) =>
    edit(commands, `${taskTitle}: ${what}`);

  return (
    <div className="grid gap-1">
      {showOpening ? (
        <OpeningRow
          taskId={taskId}
          label={taskTitle}
          onCommands={emit('открытие')}
        />
      ) : null}
      {showTaskDeadline ? (
        <DeadlineRow
          taskId={taskId}
          label={taskTitle}
          onCommands={emit('общий дедлайн')}
        />
      ) : null}

      <RowsHeading>Подгруппы</RowsHeading>
      {STUDENT_GROUPS.map((group) => {
        const target: OverrideTarget = { kind: 'group', groupId: group.id };
        const override = findOverride(schedule, taskId, target);
        const key = overrideKey(taskId, target);

        return (
          <PropertyRow
            key={group.id}
            label={group.name}
            note={
              override?.reason ? (
                <p className="truncate text-xs text-muted-foreground">
                  {override.reason}
                </p>
              ) : null
            }
          >
            <ValuePopover
              title={`${taskTitle}: ${group.name}`}
              pending={keys.has(key)}
              onRevert={() => dropPending(new Set([key]))}
              trigger={
                <DeadlineText
                  value={override?.value ?? { kind: 'inherit' }}
                  inherited={task.deadline}
                />
              }
            >
              <LevelEditor
                taskId={taskId}
                target={target}
                value={override?.value ?? { kind: 'inherit' }}
                inherited={task.deadline}
                reason={override?.reason}
                onCommands={emit(`группа ${group.name}`)}
              />
            </ValuePopover>
          </PropertyRow>
        );
      })}

      <RowsHeading
        action={
          <StudentPicker
            align="end"
            excludeIds={personal.map((item) =>
              item.target.kind === 'student' ? item.target.studentId : ''
            )}
            onPick={(studentId) => {
              const student = studentsById.get(studentId)!;
              const current = effectiveDeadline(schedule, taskId, student);
              emit(`личное, ${studentName(student)}`)([
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
              <Button variant="ghost" size="xs">
                <Plus /> Добавить
              </Button>
            }
          />
        }
      >
        Личные переопределения
      </RowsHeading>
      {personal.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Нет. Каждый студент получает дедлайн своей группы.
        </p>
      ) : (
        <ul className="grid gap-1">
          {personal.map((item) => {
            if (item.target.kind !== 'student') {
              return null;
            }

            const student = studentsById.get(item.target.studentId)!;
            const key = overrideKey(taskId, item.target);
            const label = `личное, ${studentName(student)}`;

            return (
              <li
                key={student.id}
                className="grid grid-cols-[8.5rem_minmax(0,1fr)_auto] items-start gap-x-3"
              >
                <span className="grid min-h-8 content-center">
                  <span className="truncate text-sm">
                    {studentName(student)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {groupName(student.groupId)}
                  </span>
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <ValuePopover
                    title={`${taskTitle}: ${studentName(student)}`}
                    pending={keys.has(key)}
                    onRevert={() => dropPending(new Set([key]))}
                    trigger={<DeadlineText value={item.value} />}
                  >
                    <LevelEditor
                      taskId={taskId}
                      target={item.target}
                      value={item.value}
                      inherited={
                        groupDeadline(schedule, taskId, student.groupId).value
                      }
                      reason={item.reason}
                      inheritLabel="Как у группы"
                      onCommands={emit(label)}
                    />
                  </ValuePopover>
                  {item.reason ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.reason}
                    </span>
                  ) : null}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Снять личное переопределение: ${studentName(student)}`}
                  onClick={() =>
                    emit(`снято ${label}`)([
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
    </div>
  );
}
