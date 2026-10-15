// PROTOTYPE (#181): «Продлить дедлайны» for chosen Students across several
// Tasks — a sibling of the «Вопрос» shift window built from the same parts.
// A shift changes the schedule for everyone; an extension is an exception
// for some people, so it starts with them and asks for a reason they see.
import {
  ChevronDown,
  CircleCheck,
  LoaderCircle,
  TriangleAlert,
  UsersRound,
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
import {
  BeforeAfter,
  ChangeLine,
  ChangesBox,
  ChangesTask,
  Unchanged,
} from '@/features/course/prototype/task-and-deadline-settings/ui/shift/preview';
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

/** «Иванов А. А., Смирнова Д. И. и ещё 3» — one line, whatever the count. */
function studentsSummary(studentIds: readonly string[]) {
  const names = studentIds.map((id) => studentName(studentsById.get(id)!));
  return names.length <= 2
    ? names.join(', ')
    : `${names.slice(0, 2).join(', ')} и ещё ${names.length - 2}`;
}

/**
 * A field of fixed size, like the Task picker: ticking Students changes
 * only its text, so the list under it never moves.
 */
function StudentField({ draft }: { draft: ExtendDraft }) {
  const empty = draft.studentIds.length === 0;

  return (
    <StudentPicker
      selectedIds={draft.studentIds}
      onPick={(studentId) =>
        draft.setStudentIds(
          draft.studentIds.includes(studentId)
            ? draft.studentIds.filter((id) => id !== studentId)
            : [...draft.studentIds, studentId]
        )
      }
      trigger={
        <button
          type="button"
          className={cn(
            'inline-flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted',
            empty && 'text-muted-foreground'
          )}
        >
          <UsersRound className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left">
            {empty ? 'Выберите студентов' : studentsSummary(draft.studentIds)}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      }
    />
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
      <span>или все задания с дедлайном студента</span>
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
        <BeforeAfter
          before={before}
          after={formatCompactMoment(row.outcome.after)}
          badge={<SourceBadge source={row.before.source} />}
        />
      );
    case 'no-deadline':
      return <Unchanged>без дедлайна, не продлевается</Unchanged>;
    case 'already-later':
      return <Unchanged>{before}, уже позже</Unchanged>;
  }
}

/** Every Student's own result: their Effective Deadlines differ. */
function Preview({ draft }: { draft: ExtendDraft }) {
  const tasks = useSandbox((state) => state.tasks);
  const rows = draft.plan.rows;

  return (
    <ChangesBox
      empty={
        rows.length === 0
          ? 'Выберите студентов и задания, здесь появятся их новые дедлайны'
          : null
      }
    >
      {draft.orderedTaskIds.map((taskId) => (
        <ChangesTask key={taskId} title={tasks[taskId]?.title ?? taskId}>
          {rows
            .filter((row) => row.taskId === taskId)
            .map((row) => {
              const student = studentsById.get(row.studentId)!;
              return (
                <ChangeLine
                  key={row.key}
                  who={studentName(student)}
                  note={groupName(student.groupId)}
                >
                  <RowOutcome row={row} />
                </ChangeLine>
              );
            })}
        </ChangesTask>
      ))}
    </ChangesBox>
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
          Отдельным студентам: каждый получит свой дедлайн по выбранным
          заданиям.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-5 overflow-y-auto px-6 pb-5">
        <Section title="Студенты">
          <StudentField draft={draft} />
        </Section>

        <Section title="Задания">
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
                  {ids.length === 0 ? 'Выберите задания' : taskSummary(draft)}
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
            draft.blocked && 'text-muted-foreground',
            !draft.blocked &&
              draft.flipsKind === 'warn' &&
              'text-amber-800 dark:text-amber-300',
            !draft.blocked &&
              draft.flipsKind !== 'warn' &&
              'text-emerald-700 dark:text-emerald-300'
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
            {extendButtonLabel(apply === 'batch', count)}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

function extendButtonLabel(batch: boolean, count: number) {
  if (batch) {
    return 'Добавить к неприменённым';
  }

  return count > 0
    ? `Продлить ${count} ${plural(count, 'дедлайн', 'дедлайна', 'дедлайнов')}`
    : 'Продлить';
}
