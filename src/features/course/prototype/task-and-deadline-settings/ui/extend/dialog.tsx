// PROTOTYPE (#181): «Продлить дедлайны» for chosen Students across several
// Tasks — a sibling of the «Вопрос» shift window built from the same parts.
// A shift changes the schedule for everyone; an extension is an exception
// for some people, so it starts with them and asks for a reason they see.
import { Fragment } from 'react';
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  LoaderCircle,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import { studentName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  STUDENTS,
  useSandbox,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { formatCompactMoment } from '@/features/course/prototype/task-and-deadline-settings/time';
import { SourceBadge } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import {
  groupName,
  plural,
  taskSummary,
} from '@/features/course/prototype/task-and-deadline-settings/ui/shift/model';
import {
  DaysPicker,
  Section,
  TaskPicker,
  UntilCell,
} from '@/features/course/prototype/task-and-deadline-settings/ui/shift/parts';
import { StudentPicker } from '@/features/course/prototype/task-and-deadline-settings/ui/student-picker';
import {
  useExtendDraft,
  type ExtendDraft,
  type ExtendPreset,
  type ExtendRow,
} from './model';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));

/** Extensions only go forward, so no negative steps. */
const EXTEND_STEPS = [1, 2, 3, 7, 14];

export function ExtendDialog({
  preset,
  onClose,
  onApplied,
}: {
  preset: ExtendPreset | null;
  onClose: () => void;
  /** After an extension went through, before the window closes. */
  onApplied?: () => void;
}) {
  return (
    <Dialog open={preset !== null} onOpenChange={(open) => !open && onClose()}>
      {preset === null ? null : (
        <ExtendBody
          preset={preset}
          onClose={onClose}
          onApplied={() => {
            onApplied?.();
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

function StudentChips({ draft }: { draft: ExtendDraft }) {
  function toggle(studentId: string) {
    draft.setStudentIds(
      draft.studentIds.includes(studentId)
        ? draft.studentIds.filter((id) => id !== studentId)
        : [...draft.studentIds, studentId]
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {draft.studentIds.map((studentId) => {
        const student = studentsById.get(studentId)!;
        return (
          <span
            key={studentId}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border pr-1 pl-2.5 text-sm',
              'border-violet-500/40 bg-violet-500/10'
            )}
          >
            {studentName(student)}
            <span className="text-xs text-muted-foreground">
              {groupName(student.groupId)}
            </span>
            <button
              type="button"
              aria-label={`Убрать: ${studentName(student)}`}
              onClick={() => toggle(studentId)}
              className="grid size-6 cursor-pointer place-items-center rounded hover:bg-violet-500/15"
            >
              <X className="size-3.5" />
            </button>
          </span>
        );
      })}
      <StudentPicker
        selectedIds={draft.studentIds}
        onPick={toggle}
        trigger={
          <button
            type="button"
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-2.5 text-sm',
              'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Plus className="size-4" />
            {draft.studentIds.length ? 'Ещё студент' : 'Выбрать студентов'}
          </button>
        }
      />
    </div>
  );
}

function PeriodField({
  value,
  label,
  placeholder,
  active,
  onChange,
}: {
  value: string;
  label: string;
  placeholder: string;
  active: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      aria-label={label}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'h-8 w-16 rounded-md border bg-transparent px-2 text-center text-sm text-foreground tabular-nums outline-none',
        'placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring',
        active && 'border-foreground'
      )}
    />
  );
}

/** «или все Task с дедлайном с 20.10 по 26.10» — how a sick leave is told. */
function PeriodFields({ draft }: { draft: ExtendDraft }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span>или все Task с дедлайном студента</span>
      <span className="inline-flex items-center gap-2">
        с
        <PeriodField
          value={draft.period.from}
          label="Начало периода"
          placeholder="20.10"
          active={draft.periodActive}
          onChange={(from) => draft.setPeriod(from, draft.period.to)}
        />
        по
        <PeriodField
          value={draft.period.to}
          label="Конец периода"
          placeholder="26.10"
          active={draft.periodActive}
          onChange={(to) => draft.setPeriod(draft.period.from, to)}
        />
      </span>
    </div>
  );
}

function RowOutcome({ row }: { row: ExtendRow }) {
  const before =
    row.before.value.kind === 'at'
      ? formatCompactMoment(row.before.value.at)
      : 'без дедлайна';

  switch (row.outcome.kind) {
    case 'extend':
      return (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <span className="text-muted-foreground">{before}</span>
          <SourceBadge source={row.before.source} />
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span className="font-medium">
            {formatCompactMoment(row.outcome.after)}
          </span>
        </span>
      );
    case 'no-deadline':
      return (
        <span className="text-muted-foreground">
          без дедлайна, не продлевается
        </span>
      );
    case 'already-later':
      return (
        <span className="text-muted-foreground tabular-nums">
          {before}, уже позже
        </span>
      );
  }
}

/** Every Student's own result: their Effective Deadlines differ. */
function Preview({ draft }: { draft: ExtendDraft }) {
  const tasks = useSandbox((state) => state.tasks);
  const rows = draft.plan.rows;

  return (
    <div className="h-32 overflow-y-auto rounded-md border bg-muted/30 px-3 py-2 text-sm">
      {rows.length === 0 ? (
        <p className="grid h-full place-items-center text-center text-muted-foreground">
          Выберите студентов и Task, здесь появятся их новые дедлайны
        </p>
      ) : (
        <div className="grid gap-2">
          {draft.orderedTaskIds.map((taskId) => (
            <Fragment key={taskId}>
              <div className="grid gap-1">
                <span className="truncate text-xs text-muted-foreground">
                  {tasks[taskId]?.title}
                </span>
                {rows
                  .filter((row) => row.taskId === taskId)
                  .map((row) => {
                    const student = studentsById.get(row.studentId)!;
                    return (
                      <div
                        key={row.key}
                        className="flex flex-wrap items-center justify-between gap-x-3"
                      >
                        <span className="truncate">
                          {studentName(student)}{' '}
                          <span className="text-xs text-muted-foreground">
                            {groupName(student.groupId)}
                          </span>
                        </span>
                        <RowOutcome row={row} />
                      </div>
                    );
                  })}
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function ExtendBody({
  preset,
  onClose,
  onApplied,
}: {
  preset: ExtendPreset;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { apply } = usePrototypeSettings();
  const save = useSandbox((state) => state.save);
  const draft = useExtendDraft(preset);
  const ids = draft.orderedTaskIds;
  const count = draft.plan.commands.length;

  return (
    <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-xl">
      <DialogHeader className="gap-1 px-6 pt-5 pb-4">
        <DialogTitle className="text-lg">Продлить дедлайны</DialogTitle>
        <DialogDescription>
          Отдельным студентам: каждый получит свой дедлайн по выбранным Task.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-5 overflow-y-auto px-6 pb-5">
        <Section title="Студенты">
          <StudentChips draft={draft} />
        </Section>

        <Section title="Task">
          <TaskPicker
            draft={draft}
            trigger={
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 w-fit max-w-full cursor-pointer items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted',
                  ids.length === 0 && 'text-muted-foreground'
                )}
              >
                <span className="truncate">
                  {ids.length === 0 ? 'Выберите Task' : taskSummary(draft)}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </button>
            }
          />
          <PeriodFields draft={draft} />
        </Section>

        <Section title="На сколько">
          <DaysPicker
            days={draft.by.kind === 'days' ? draft.by.days : null}
            onChange={(days) => draft.setBy({ kind: 'days', days })}
            steps={EXTEND_STEPS}
            customSpan={1}
          >
            <UntilCell
              at={draft.by.kind === 'until' ? draft.by.at : null}
              onChange={(at) => draft.setBy({ kind: 'until', at })}
            />
          </DaysPicker>
        </Section>

        <Section title="Причина">
          <Input
            value={draft.reason}
            onChange={(event) => draft.setReason(event.target.value)}
            placeholder="Например: болезнь, справка с 20 по 26 октября"
          />
          <p className="text-xs text-muted-foreground">
            Причину увидят эти студенты рядом со своим дедлайном.
          </p>
        </Section>

        <Section title="Что изменится">
          <Preview draft={draft} />
        </Section>
      </div>

      <DialogFooter className="items-center gap-3 border-t px-6 py-3 sm:justify-between">
        <span
          aria-live="polite"
          className={cn(
            // Two lines reserved, so a wrapping line does not resize the window.
            'flex min-h-10 items-center gap-1.5 text-sm',
            draft.blocked
              ? 'text-muted-foreground'
              : draft.flipsKind === 'warn'
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-emerald-700 dark:text-emerald-300'
          )}
        >
          {draft.blocked ??
            (draft.flips ? (
              <>
                {draft.flipsKind === 'warn' ? (
                  <TriangleAlert className="size-4 shrink-0" />
                ) : (
                  <CircleCheck className="size-4 shrink-0" />
                )}
                {draft.flips[0]!.toUpperCase() + draft.flips.slice(1)}
              </>
            ) : null)}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={Boolean(draft.blocked) || save.status === 'saving'}
            onClick={() => {
              draft.submit();
              onApplied();
            }}
          >
            {save.status === 'saving' ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            {apply === 'batch'
              ? 'Добавить к неприменённым'
              : count > 0
                ? `Продлить ${count} ${plural(count, 'дедлайн', 'дедлайна', 'дедлайнов')}`
                : 'Продлить'}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
