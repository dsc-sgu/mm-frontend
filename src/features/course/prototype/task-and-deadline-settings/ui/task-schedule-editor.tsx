// PROTOTYPE (#181): every schedule value of one Task — opening time, Task
// Deadline, each Student Group and personal Deadline Overrides.
import { useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2, UserRound } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { studentName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  effectiveDeadline,
  findOverride,
  groupDeadline,
  type OverrideTarget,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  STUDENT_GROUPS,
  STUDENTS,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { DeadlineText } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { LevelEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/level-editor';
import { OpeningTimeField } from '@/features/course/prototype/task-and-deadline-settings/ui/opening-time-field';
import { StudentPicker } from '@/features/course/prototype/task-and-deadline-settings/ui/student-picker';

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

export function TaskScheduleEditor({
  taskId,
  taskTitle,
  showOpening = true,
}: {
  taskId: string;
  taskTitle: string;
  showOpening?: boolean;
}) {
  const schedule = useViewSchedule();
  const edit = useScheduleEdit();
  const { keys } = usePendingChanges();
  const [editing, setEditing] = useState<string | null>(null);
  const task = schedule.tasks[taskId]!;
  const personal = schedule.overrides.filter(
    (item) => item.taskId === taskId && item.target.kind === 'student'
  );

  const emit = (label: string) => (commands: Parameters<typeof edit>[0]) =>
    edit(commands, `${taskTitle}: ${label}`);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {showOpening ? (
        <section className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            Task Opening Time
            <PendingDot show={keys.has(`${taskId}|opening`)} />
          </h4>
          <OpeningTimeField taskId={taskId} onCommands={emit('открытие')} />
        </section>
      ) : null}

      <section className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          Общий срок
          <PendingDot show={keys.has(`${taskId}|task`)} />
        </h4>
        <LevelEditor
          taskId={taskId}
          value={task.deadline}
          onCommands={emit('общий срок')}
        />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-1">
        <h4 className="text-sm font-semibold">Student Groups</h4>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {STUDENT_GROUPS.map((group) => {
            const target: OverrideTarget = {
              kind: 'group',
              groupId: group.id,
            };
            const override = findOverride(schedule, taskId, target);
            const key = `g:${group.id}`;
            const open = editing === key;

            return (
              <li key={group.id} className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => setEditing(open ? null : key)}
                  className="flex w-full items-center gap-2 text-left text-sm"
                >
                  <span className="w-16 shrink-0 font-medium">
                    {group.name}
                  </span>
                  <PendingDot show={keys.has(`${taskId}|g:${group.id}`)} />
                  <span className="min-w-0 flex-1 truncate">
                    <DeadlineText
                      value={override?.value ?? { kind: 'inherit' }}
                      inherited={task.deadline}
                    />
                    {override?.reason ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {override.reason}
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform',
                      open && 'rotate-180'
                    )}
                  />
                </button>
                {open ? (
                  <div className="mt-2 pb-1">
                    <LevelEditor
                      taskId={taskId}
                      target={target}
                      value={override?.value ?? { kind: 'inherit' }}
                      inherited={task.deadline}
                      reason={override?.reason}
                      inheritLabel="Общий срок"
                      onCommands={emit(`группа ${group.name}`)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">
            Личные переопределения · {personal.length}
          </h4>
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
              setEditing(`s:${studentId}`);
            }}
            trigger={
              <Button variant="outline" size="xs">
                <Plus /> Student
              </Button>
            }
          />
        </div>
        {personal.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            Нет. Все Students получают срок своей группы.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {personal.map((item) => {
              if (item.target.kind !== 'student') {
                return null;
              }

              const student = studentsById.get(item.target.studentId)!;
              const key = `s:${student.id}`;
              const open = editing === key;
              const group = groupDeadline(schedule, taskId, student.groupId);

              return (
                <li key={student.id} className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <UserRound
                      className="size-4 shrink-0 text-violet-600"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {studentName(student)}
                      </span>{' '}
                      <span className="text-xs text-muted-foreground">
                        {groupName(student.groupId)}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2">
                        <DeadlineText value={item.value} />
                        {item.reason ? (
                          <span className="text-xs text-muted-foreground">
                            {item.reason}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <PendingDot show={keys.has(`${taskId}|${key}`)} />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Изменить"
                      onClick={() => setEditing(open ? null : key)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Снять личное переопределение"
                      onClick={() =>
                        emit(`снято личное, ${studentName(student)}`)([
                          {
                            type: 'reset-override',
                            taskId,
                            target: item.target,
                          },
                        ])
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {open ? (
                    <div className="mt-2 pb-1">
                      <LevelEditor
                        taskId={taskId}
                        target={item.target}
                        value={item.value}
                        inherited={group.value}
                        reason={item.reason}
                        inheritLabel="Срок группы"
                        onCommands={emit(`личное, ${studentName(student)}`)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
