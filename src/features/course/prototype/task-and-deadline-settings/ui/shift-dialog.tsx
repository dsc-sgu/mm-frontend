// PROTOTYPE (#181): mass shift — choose Tasks and recipients, see how every
// value moves, exclude single overrides, see which Attempts flip lateness.
import { useMemo, useState } from 'react';
import {
  CalendarArrowUp,
  ChevronDown,
  Minus,
  Plus,
  TriangleAlert,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import { cn } from '@/shadcn/lib/utils';
import { studentName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  applyCommands,
  isTaskOpen,
  latenessChanges,
  planShift,
  type LatenessChange,
  type ShiftRow,
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
  formatDuration,
  formatMoment,
  timeZoneLabel,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { ValueChange } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { Segmented } from '@/features/course/prototype/task-and-deadline-settings/ui/segmented';

export type ShiftPreset = {
  taskIds: string[];
  days?: number;
  groupIds?: string[];
};

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));
const groupName = (groupId: string) =>
  STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;

function daysLabel(days: number) {
  const abs = Math.abs(days);
  const word =
    abs % 10 === 1 && abs % 100 !== 11
      ? 'день'
      : [2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)
        ? 'дня'
        : 'дней';

  if (days === 0) {
    return 'без сдвига';
  }

  return `на ${abs} ${word} ${days > 0 ? 'позже' : 'раньше'}`;
}

export function ShiftDialog({
  preset,
  onClose,
}: {
  preset: ShiftPreset | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={preset !== null} onOpenChange={(open) => !open && onClose()}>
      {preset ? <ShiftDialogBody preset={preset} onClose={onClose} /> : null}
    </Dialog>
  );
}

function ShiftDialogBody({
  preset,
  onClose,
}: {
  preset: ShiftPreset;
  onClose: () => void;
}) {
  const { apply } = usePrototypeSettings();
  const schedule = useViewSchedule();
  const tasks = useSandbox((state) => state.tasks);
  const groups = useOrderedTasks();
  const edit = useScheduleEdit();

  const [taskIds, setTaskIds] = useState(() => new Set(preset.taskIds));
  const [recipients, setRecipients] = useState<'course' | 'groups'>(
    preset.groupIds?.length ? 'groups' : 'course'
  );
  const [groupIds, setGroupIds] = useState(
    () => new Set(preset.groupIds ?? [])
  );
  const [days, setDays] = useState(preset.days ?? 7);
  const [includeOpening, setIncludeOpening] = useState(false);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [showAttempts, setShowAttempts] = useState(false);

  const orderedTaskIds = useMemo(
    () =>
      groups.flatMap(({ tasks: items }) =>
        items.map((task) => task.id).filter((id) => taskIds.has(id))
      ),
    [groups, taskIds]
  );

  const plan = useMemo(
    () =>
      planShift(
        schedule,
        {
          taskIds: orderedTaskIds,
          recipients:
            recipients === 'course'
              ? { kind: 'course' }
              : { kind: 'groups', groupIds: [...groupIds] },
          days,
          includeOpening,
          excluded,
        },
        STUDENT_GROUPS,
        STUDENTS
      ),
    [
      schedule,
      orderedTaskIds,
      recipients,
      groupIds,
      days,
      includeOpening,
      excluded,
    ]
  );

  const flips = useMemo(
    () =>
      latenessChanges(
        schedule,
        applyCommands(schedule, plan.commands),
        ATTEMPTS.filter((attempt) => taskIds.has(attempt.taskId)),
        STUDENTS
      ),
    [schedule, plan.commands, taskIds]
  );

  const changing = plan.rows.filter(
    (row) =>
      row.included && row.kind !== 'no-deadline' && row.kind !== 'follows'
  ).length;
  const canApply =
    plan.commands.length > 0 &&
    days !== 0 &&
    (recipients === 'course' || groupIds.size > 0);

  function toggle<T>(set: ReadonlySet<T>, value: T) {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return next;
  }

  function submit() {
    const scope =
      recipients === 'course'
        ? 'весь Course'
        : [...groupIds].map(groupName).join(', ');
    edit(
      plan.commands,
      `сдвиг ${daysLabel(days)}: ${orderedTaskIds.length} Task, ${scope}`
    );
    onClose();
  }

  return (
    <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
      <DialogHeader className="border-b px-5 py-4">
        <DialogTitle className="flex items-center gap-2">
          <CalendarArrowUp className="size-5" /> Сдвинуть сроки
        </DialogTitle>
        <DialogDescription>
          Время — {timeZoneLabel()}. «Без срока» не сдвигается.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[18rem_1fr] md:overflow-hidden">
        <div className="grid min-w-0 content-start gap-5 overflow-x-hidden border-b p-5 *:min-w-0 md:overflow-y-auto md:border-r md:border-b-0">
          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">На сколько</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="На день раньше"
                onClick={() => setDays(days - 1)}
              >
                <Minus />
              </Button>
              <input
                type="number"
                value={days}
                onChange={(event) => setDays(Number(event.target.value) || 0)}
                className="h-8 w-16 rounded-md border border-input bg-background text-center font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="На день позже"
                onClick={() => setDays(days + 1)}
              >
                <Plus />
              </Button>
              <span className="ml-1 text-sm text-muted-foreground">
                {daysLabel(days)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {[-7, -1, 1, 2, 7, 14].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDays(value)}
                  className={cn(
                    'rounded border px-1.5 py-0.5 font-mono text-xs',
                    value === days
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {value > 0 ? `+${value}` : value}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">Кому</h3>
            <Segmented
              value={recipients}
              onChange={setRecipients}
              options={[
                { value: 'course', label: 'Весь Course' },
                { value: 'groups', label: 'Student Groups' },
              ]}
            />
            {recipients === 'groups' ? (
              <div className="grid grid-cols-2 gap-1.5">
                {STUDENT_GROUPS.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={groupIds.has(group.id)}
                      onCheckedChange={() =>
                        setGroupIds(toggle(groupIds, group.id))
                      }
                    />
                    {group.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Двигается общий срок; наследующие группы следуют за ним.
                Переопределения можно исключить справа.
              </p>
            )}
            <label className="mt-1 flex items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={includeOpening}
                onCheckedChange={(value) => setIncludeOpening(value === true)}
              />
              <span>
                И Task Opening Time
                <span className="block text-xs text-muted-foreground">
                  Например, семестр начался на неделю позже.
                </span>
              </span>
            </label>
          </section>

          <section className="grid gap-2">
            <h3 className="flex items-center justify-between text-sm font-semibold">
              Task · {taskIds.size}
              <button
                type="button"
                className="text-xs font-normal text-primary hover:underline"
                onClick={() =>
                  setTaskIds(
                    taskIds.size ===
                      groups.reduce((sum, item) => sum + item.tasks.length, 0)
                      ? new Set()
                      : new Set(
                          groups.flatMap((item) =>
                            item.tasks.map((task) => task.id)
                          )
                        )
                  )
                }
              >
                все / ни одной
              </button>
            </h3>
            {groups.map(({ group, tasks: items }) => (
              <div key={group.id} className="grid gap-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.title}
                </p>
                {items.map((task) => (
                  <label
                    key={task.id}
                    className="flex min-w-0 items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={taskIds.has(task.id)}
                      onCheckedChange={() =>
                        setTaskIds(toggle(taskIds, task.id))
                      }
                    />
                    <span className="truncate">{task.title}</span>
                  </label>
                ))}
              </div>
            ))}
          </section>
        </div>

        <div className="grid content-start gap-4 p-5 md:overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-muted px-2 py-1 font-medium">
              Изменится значений: {changing}
            </span>
            <FlipBadge
              tone="late"
              count={flips.becameLate.length}
              label="станут опоздавшими"
            />
            <FlipBadge
              tone="ok"
              count={flips.becameOnTime.length}
              label="перестанут быть опоздавшими"
            />
            {flips.becameLate.length + flips.becameOnTime.length > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={() => setShowAttempts(!showAttempts)}
              >
                Какие Attempts
                <ChevronDown
                  className={cn(
                    'size-3 transition-transform',
                    showAttempts && 'rotate-180'
                  )}
                />
              </button>
            ) : null}
          </div>

          {showAttempts ? (
            <AttemptFlips
              flips={[...flips.becameLate, ...flips.becameOnTime]}
              taskTitle={(taskId) => tasks[taskId]?.title ?? taskId}
            />
          ) : null}

          {orderedTaskIds.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Выберите хотя бы одну Task.
            </p>
          ) : null}

          {orderedTaskIds.map((taskId) => (
            <TaskShiftPreview
              key={taskId}
              title={tasks[taskId]?.title ?? taskId}
              rows={plan.rows.filter((row) => row.taskId === taskId)}
              onToggle={(key) => setExcluded(toggle(excluded, key))}
            />
          ))}
        </div>
      </div>

      <DialogFooter className="border-t px-5 py-3">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button disabled={!canApply} onClick={submit}>
          {apply === 'batch'
            ? `Добавить в правки · ${changing}`
            : `Сдвинуть · ${changing}`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function FlipBadge({
  tone,
  count,
  label,
}: {
  tone: 'late' | 'ok';
  count: number;
  label: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
        count === 0
          ? 'bg-muted text-muted-foreground'
          : tone === 'late'
            ? 'bg-red-500/10 text-red-700 dark:text-red-300'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      )}
    >
      {count > 0 && tone === 'late' ? (
        <TriangleAlert className="size-3" />
      ) : null}
      {count} Attempts {label}
    </span>
  );
}

function AttemptFlips({
  flips,
  taskTitle,
}: {
  flips: LatenessChange[];
  taskTitle: (taskId: string) => string;
}) {
  return (
    <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border text-xs">
      {flips.map(({ attempt, after }) => {
        const student = studentsById.get(attempt.studentId)!;
        return (
          <li key={attempt.id} className="flex flex-wrap gap-x-3 px-3 py-1.5">
            <span className="font-medium">{studentName(student)}</span>
            <span className="text-muted-foreground">
              {taskTitle(attempt.taskId)}
            </span>
            <span>отправлена {formatMoment(attempt.submittedAt)}</span>
            <span
              className={
                after.kind === 'late'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }
            >
              {after.kind === 'late'
                ? `станет опоздавшей на ${formatDuration(after.by)}`
                : 'станет вовремя'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const LEVEL_LABEL: Record<ShiftRow['level'], string> = {
  task: 'Общий',
  opening: 'Открытие',
  group: 'Группа',
  student: 'Личное',
};

function rowTarget(row: ShiftRow) {
  if (row.target?.kind === 'group') {
    return groupName(row.target.groupId);
  }

  if (row.target?.kind === 'student') {
    const student = studentsById.get(row.target.studentId)!;
    return `${studentName(student)}, ${groupName(student.groupId)}`;
  }

  return row.level === 'opening' ? 'Task Opening Time' : 'Deadline Task';
}

function rowNote(row: ShiftRow) {
  switch (row.kind) {
    case 'create-override':
      return 'Наследовала общий срок — получит своё переопределение';
    case 'follows':
      return 'Наследует общий срок и сдвинется вместе с ним';
    case 'no-deadline':
      return 'Без срока — не сдвигается';
    case 'opening-course-only':
      return 'Время открытия одно на всю Task: сдвигается только для всего Course';
    case 'shift':
      if (row.equalsTaskDeadline) {
        return 'Совпадёт с общим сроком, но останется явным переопределением';
      }
      if (
        row.level === 'opening' &&
        row.before.kind === 'at' &&
        row.after.kind === 'at' &&
        row.after.at > row.before.at &&
        isTaskOpen(row.before.at)
      ) {
        return `Уже открыта всем ${STUDENTS.length} Students: для них перенос ничего не меняет`;
      }
      return row.excludable && !row.included
        ? 'Исключено из сдвига — останется как есть'
        : '';
  }
}

function TaskShiftPreview({
  title,
  rows,
  onToggle,
}: {
  title: string;
  rows: ShiftRow[];
  onToggle: (key: string) => void;
}) {
  return (
    <section className="rounded-lg border">
      <h4 className="border-b bg-muted/40 px-3 py-1.5 text-sm font-semibold">
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          Для выбранных групп нечего сдвигать.
        </p>
      ) : (
        <ul className="divide-y text-sm">
          {rows.map((row) => {
            const note = rowNote(row);
            const muted =
              row.kind === 'no-deadline' ||
              row.kind === 'opening-course-only' ||
              row.kind === 'follows' ||
              !row.included;

            return (
              <li
                key={row.key}
                className={cn(
                  'grid grid-cols-[1.25rem_5.5rem_1fr] items-start gap-x-2 px-3 py-1.5',
                  'sm:grid-cols-[1.25rem_5.5rem_12rem_1fr]',
                  muted && 'text-muted-foreground'
                )}
              >
                <span className="pt-0.5">
                  {row.excludable ? (
                    <Checkbox
                      aria-label="Включить в сдвиг"
                      checked={row.included}
                      onCheckedChange={() => onToggle(row.key)}
                    />
                  ) : null}
                </span>
                <span className="text-xs font-medium tracking-wide uppercase">
                  {LEVEL_LABEL[row.level]}
                </span>
                <span className="truncate">{rowTarget(row)}</span>
                <span className="col-span-3 grid gap-0.5 sm:col-span-1">
                  {row.kind === 'no-deadline' ||
                  row.kind === 'opening-course-only' ? null : (
                    <ValueChange
                      before={
                        row.kind === 'create-override'
                          ? { kind: 'inherit' }
                          : row.before
                      }
                      inheritedBefore={row.before}
                      after={row.after}
                      defaultTime={row.level === 'opening' ? '00:00' : '23:59'}
                    />
                  )}
                  {note ? <span className="text-xs">{note}</span> : null}
                  {row.reason ? (
                    <span className="text-xs text-muted-foreground">
                      Причина: {row.reason}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
