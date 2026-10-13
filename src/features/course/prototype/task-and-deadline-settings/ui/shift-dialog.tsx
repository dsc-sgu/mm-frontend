// PROTOTYPE (#181): mass shift. `?shift=` picks the window: «Вопрос»,
// «Фраза», «Сразу» (ui/shift/) or this «Таблица»: settings in one strip
// (Stripe-like shortcuts), the preview a «было → стало» table with a
// checkbox per Deadline Override (Arcade «Review changes»).
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  LoaderCircle,
  Minus,
  Plus,
  TriangleAlert,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/shadcn/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
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
import { DeadlineText } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import { Segmented } from '@/features/course/prototype/task-and-deadline-settings/ui/segmented';
import type { ShiftPreset } from './shift/model';
import { VariantSwitch } from './shift/parts';
import { QuestionBody } from './shift/question';
import { SentenceBody } from './shift/sentence';
import { ApplyNow, QuickShiftBody } from './shift/undo';

export type { ShiftPreset } from './shift/model';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));
const groupName = (groupId: string) =>
  STUDENT_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;

function plural(count: number, one: string, few: string, many: string) {
  const abs = Math.abs(count);
  if (abs % 10 === 1 && abs % 100 !== 11) {
    return one;
  }
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) {
    return few;
  }
  return many;
}

function daysLabel(days: number) {
  if (days === 0) {
    return 'без сдвига';
  }

  const abs = Math.abs(days);
  return `на ${abs} ${plural(abs, 'день', 'дня', 'дней')} ${days > 0 ? 'позже' : 'раньше'}`;
}

function toggle<T>(set: ReadonlySet<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function ShiftDialog({
  preset,
  onClose,
  onApplied,
}: {
  preset: ShiftPreset | null;
  onClose: () => void;
  /** After a shift went through, before the window closes. */
  onApplied?: () => void;
}) {
  const { shift } = usePrototypeSettings();
  const applied = () => {
    onApplied?.();
    onClose();
  };

  // «Сразу»: a drag already says how far, so nothing to ask.
  if (shift === 'undo' && preset?.days !== undefined) {
    return <ApplyNow preset={preset} onApplied={applied} />;
  }

  return (
    <Dialog open={preset !== null} onOpenChange={(open) => !open && onClose()}>
      {preset === null ? null : shift === 'question' ? (
        <QuestionBody preset={preset} onClose={onClose} onApplied={applied} />
      ) : shift === 'sentence' ? (
        <SentenceBody preset={preset} onClose={onClose} onApplied={applied} />
      ) : shift === 'undo' ? (
        <QuickShiftBody preset={preset} onApplied={applied} />
      ) : (
        <ShiftDialogBody
          preset={preset}
          onClose={onClose}
          onApplied={applied}
        />
      )}
    </Dialog>
  );
}

function ShiftDialogBody({
  preset,
  onClose,
  onApplied,
}: {
  preset: ShiftPreset;
  onClose: () => void;
  /** After a shift went through; closes the window. */
  onApplied: () => void;
}) {
  const { apply } = usePrototypeSettings();
  const schedule = useViewSchedule();
  const tasks = useSandbox((state) => state.tasks);
  const save = useSandbox((state) => state.save);
  const groups = useOrderedTasks();
  const edit = useScheduleEdit();

  const [taskIds, setTaskIds] = useState<ReadonlySet<string>>(
    () => new Set(preset.taskIds)
  );
  const [recipients, setRecipients] = useState<'course' | 'groups'>(
    preset.groupIds?.length ? 'groups' : 'course'
  );
  const [groupIds, setGroupIds] = useState<ReadonlySet<string>>(
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
  const excludable = plan.rows.filter((row) => row.excludable);
  const canApply =
    plan.commands.length > 0 &&
    days !== 0 &&
    (recipients === 'course' || groupIds.size > 0);

  function submit() {
    const scope =
      recipients === 'course'
        ? 'весь Course'
        : [...groupIds].map(groupName).join(', ');
    edit(
      plan.commands,
      `сдвиг ${daysLabel(days)}: ${orderedTaskIds.length} Task, ${scope}`
    );
    onApplied();
  }

  const taskSummary =
    orderedTaskIds.length === 0
      ? 'Выберите Task'
      : orderedTaskIds.length === 1
        ? tasks[orderedTaskIds[0]!]?.title
        : `${orderedTaskIds.length} Task`;

  return (
    <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-4xl">
      <DialogHeader className="gap-3 px-5 pt-5 pb-4">
        <VariantSwitch />
        <DialogTitle>Сдвинуть дедлайны</DialogTitle>
        <DialogDescription>
          Время в поясе {timeZoneLabel()}. Значения «без дедлайна» не двигаются.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 border-y bg-muted/30 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Modal, so the portaled list scrolls inside the Dialog. */}
          <Popover modal>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="max-w-72">
                <span className="truncate">{taskSummary}</span>
                <ChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <Command>
                <CommandList className="max-h-80">
                  {groups.map(({ group, tasks: items }) => (
                    <CommandGroup key={group.id} heading={group.title}>
                      {items.map((task) => (
                        <CommandItem
                          key={task.id}
                          value={task.title}
                          onSelect={() => setTaskIds(toggle(taskIds, task.id))}
                        >
                          <Checkbox
                            checked={taskIds.has(task.id)}
                            tabIndex={-1}
                            aria-hidden="true"
                          />
                          <span className="truncate">{task.title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Segmented
            value={recipients}
            onChange={setRecipients}
            label="Кому"
            options={[
              { value: 'course', label: 'Весь Course' },
              { value: 'groups', label: 'Student Groups' },
            ]}
          />
          {recipients === 'groups'
            ? STUDENT_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  aria-pressed={groupIds.has(group.id)}
                  onClick={() => setGroupIds(toggle(groupIds, group.id))}
                  className={cn(
                    'h-8 rounded-md border px-2.5 text-sm',
                    groupIds.has(group.id)
                      ? 'border-sky-500/50 bg-sky-500/10 text-sky-900 dark:text-sky-200'
                      : 'border-border bg-background hover:bg-muted'
                  )}
                >
                  {group.name}
                </button>
              ))
            : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border bg-background">
            <button
              type="button"
              aria-label="На день раньше"
              onClick={() => setDays(days - 1)}
              className="grid size-8 place-items-center hover:bg-muted"
            >
              <Minus className="size-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={days}
              aria-label="Дней"
              onChange={(event) =>
                setDays(Number.parseInt(event.target.value, 10) || 0)
              }
              className="h-8 w-12 border-x bg-transparent text-center text-sm tabular-nums outline-none"
            />
            <button
              type="button"
              aria-label="На день позже"
              onClick={() => setDays(days + 1)}
              className="grid size-8 place-items-center hover:bg-muted"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <span className="w-36 text-sm">{daysLabel(days)}</span>
          <div className="flex flex-wrap gap-1">
            {[-7, -1, 1, 2, 7, 14].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={cn(
                  'h-7 rounded-md border px-2 text-xs tabular-nums',
                  value === days
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background hover:bg-muted'
                )}
              >
                {value > 0 ? `+${value}` : `−${-value}`}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeOpening}
              onCheckedChange={(value) => setIncludeOpening(value === true)}
            />
            И время открытия
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
        <span>
          Изменится значений: <b>{changing}</b>
        </span>
        {flips.becameLate.length + flips.becameOnTime.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowAttempts(!showAttempts)}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <TriangleAlert className="size-3.5 text-amber-600" />
            Attempts: станут опоздавшими {flips.becameLate.length}, перестанут{' '}
            {flips.becameOnTime.length}
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform',
                showAttempts && 'rotate-180'
              )}
            />
          </button>
        ) : (
          <span className="text-muted-foreground">
            Статус опоздания Attempts не изменится
          </span>
        )}
      </div>
      {showAttempts ? (
        <AttemptFlips
          flips={[...flips.becameLate, ...flips.becameOnTime]}
          taskTitle={(taskId) => tasks[taskId]?.title ?? taskId}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto border-t">
        {orderedTaskIds.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Выберите хотя бы одну Task.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-10 py-2 pl-5" />
                <th className="py-2 font-medium">Что</th>
                <th className="py-2 font-medium">Было</th>
                <th className="w-6" />
                <th className="py-2 font-medium">Стало</th>
                <th className="py-2 pr-5 font-medium">Примечание</th>
              </tr>
            </thead>
            {orderedTaskIds.map((taskId) => (
              <TaskRows
                key={taskId}
                title={tasks[taskId]?.title ?? taskId}
                rows={plan.rows.filter((row) => row.taskId === taskId)}
                onToggle={(key) => setExcluded(toggle(excluded, key))}
              />
            ))}
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {excludable.length > 0
            ? `В сдвиге переопределений: ${excludable.filter((row) => row.included).length} из ${excludable.length}`
            : ''}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!canApply || save.status === 'saving'}
            onClick={submit}
          >
            {save.status === 'saving' ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            {apply === 'batch'
              ? `Добавить к неприменённым: ${changing}`
              : `Сдвинуть: ${changing}`}
          </Button>
        </div>
      </div>
    </DialogContent>
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
    <ul className="mx-5 mb-3 max-h-40 divide-y overflow-y-auto rounded-lg border text-xs">
      {flips.map(({ attempt, after }) => {
        const student = studentsById.get(attempt.studentId)!;
        return (
          <li
            key={attempt.id}
            className="grid grid-cols-[10rem_minmax(0,1fr)_auto] gap-3 px-3 py-1.5"
          >
            <span className="truncate font-medium">{studentName(student)}</span>
            <span className="truncate text-muted-foreground">
              {taskTitle(attempt.taskId)}, отправлена{' '}
              {formatMoment(attempt.submittedAt)}
            </span>
            <span
              className={
                after.kind === 'late'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }
            >
              {after.kind === 'late'
                ? `опоздает на ${formatDuration(after.by)}`
                : 'станет вовремя'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function rowTarget(row: ShiftRow) {
  if (row.target?.kind === 'group') {
    return groupName(row.target.groupId);
  }

  if (row.target?.kind === 'student') {
    const student = studentsById.get(row.target.studentId)!;
    return `${studentName(student)} (${groupName(student.groupId)})`;
  }

  return row.level === 'opening' ? 'Время открытия' : 'Общий дедлайн';
}

function rowNote(row: ShiftRow) {
  switch (row.kind) {
    case 'create-override':
      return 'Получит своё переопределение';
    case 'follows':
      return 'Наследует общий дедлайн';
    case 'no-deadline':
      return 'Без дедлайна, не двигается';
    case 'opening-course-only':
      return 'Двигается только для всего Course';
    case 'shift':
      if (row.equalsTaskDeadline) {
        return 'Совпадёт с общим, но останется явным';
      }
      if (
        row.level === 'opening' &&
        row.before.kind === 'at' &&
        row.after.kind === 'at' &&
        row.after.at > row.before.at &&
        isTaskOpen(row.before.at)
      ) {
        return `Уже открыта ${STUDENTS.length} Students, им ничего не меняет`;
      }
      if (row.excludable && !row.included) {
        return 'Останется как есть';
      }
      return row.reason;
  }
}

function TaskRows({
  title,
  rows,
  onToggle,
}: {
  title: string;
  rows: ShiftRow[];
  onToggle: (key: string) => void;
}) {
  return (
    <tbody>
      <tr className="bg-muted/40">
        <td />
        <td colSpan={5} className="py-1.5 pr-5 text-sm font-medium">
          {title}
        </td>
      </tr>
      {rows.length === 0 ? (
        <tr className="border-t">
          <td />
          <td colSpan={5} className="py-2 pr-5 text-muted-foreground">
            У выбранных групп нечего сдвигать
          </td>
        </tr>
      ) : null}
      {rows.map((row) => {
        const quiet =
          row.kind === 'no-deadline' ||
          row.kind === 'opening-course-only' ||
          row.kind === 'follows' ||
          !row.included;
        const time = row.level === 'opening' ? '00:00' : '23:59';
        const showValues =
          row.kind !== 'no-deadline' && row.kind !== 'opening-course-only';

        return (
          <tr
            key={row.key}
            className={cn('border-t', quiet && 'text-muted-foreground')}
          >
            <td className="py-1.5 pl-5">
              {row.excludable ? (
                <Checkbox
                  aria-label={`Сдвинуть: ${rowTarget(row)}`}
                  checked={row.included}
                  onCheckedChange={() => onToggle(row.key)}
                />
              ) : null}
            </td>
            <td className="max-w-56 truncate py-1.5 pr-3">{rowTarget(row)}</td>
            <td className="py-1.5 pr-1 whitespace-nowrap">
              {showValues ? (
                <DeadlineText
                  compact
                  defaultTime={time}
                  value={
                    row.kind === 'create-override' || row.kind === 'follows'
                      ? { kind: 'inherit' }
                      : row.before
                  }
                  inherited={row.before}
                />
              ) : (
                <DeadlineText compact defaultTime={time} value={row.before} />
              )}
            </td>
            <td className="py-1.5 text-muted-foreground">
              {showValues ? <ArrowRight className="size-3.5" /> : null}
            </td>
            <td className="py-1.5 pr-3 whitespace-nowrap">
              {showValues ? (
                <DeadlineText
                  compact
                  defaultTime={time}
                  value={
                    row.kind === 'follows' ? { kind: 'inherit' } : row.after
                  }
                  inherited={row.after}
                />
              ) : null}
            </td>
            <td className="max-w-64 truncate py-1.5 pr-5 text-xs text-muted-foreground">
              {rowNote(row)}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}
