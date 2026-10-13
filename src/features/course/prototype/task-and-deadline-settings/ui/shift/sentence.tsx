// PROTOTYPE (#181): shift window «Фраза». The whole action reads as one
// sentence whose parts are picked in place (Workable automations); what it
// changes folds into one-line summaries (Clockwise «Move event»).
import { useState, type ReactNode } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { ShiftRow } from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  STUDENT_GROUPS,
  STUDENTS,
  useSandbox,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatDuration,
  formatMoment,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { DeadlineText } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import {
  daysLabel,
  flipsSentence,
  groupName,
  movingRows,
  plural,
  taskSummary,
  toggleIn,
  useShiftDraft,
  type ShiftDraft,
  type ShiftPreset,
  type ShiftScope,
} from './model';
import { DaysStepper, TaskPicker, Unfold, VariantSwitch } from './parts';

const studentsById = new Map(STUDENTS.map((student) => [student.id, student]));

/** A word of the sentence that opens its own picker. */
const TOKEN = cn(
  'rounded-sm border-b-2 border-dashed border-foreground/30 font-medium',
  'hover:border-foreground/60 hover:bg-muted focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-ring'
);

function Token({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={TOKEN}>
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        {children}
      </PopoverContent>
    </Popover>
  );
}

const SCOPE_WORDS: Record<ShiftScope, string> = {
  everything: 'вместе с дедлайнами групп и Students',
  'general-only': 'только общий дедлайн',
  groups: 'только для групп',
};

function scopeLabel(draft: ShiftDraft) {
  if (draft.scope !== 'groups') {
    return SCOPE_WORDS[draft.scope];
  }

  return draft.groupIds.size
    ? `только для ${[...draft.groupIds].map(groupName).join(', ')}`
    : 'только для групп…';
}

function rowWho(row: ShiftRow) {
  if (row.target?.kind === 'group') {
    return groupName(row.target.groupId);
  }
  if (row.target?.kind === 'student') {
    return studentName(studentsById.get(row.target.studentId)!);
  }
  return row.level === 'opening' ? 'Открытие' : 'Общий';
}

export function SentenceBody({
  preset,
  onClose,
}: {
  preset: ShiftPreset;
  onClose: () => void;
}) {
  const { apply } = usePrototypeSettings();
  const save = useSandbox((state) => state.save);
  const tasks = useSandbox((state) => state.tasks);
  const draft = useShiftDraft(preset);
  const [openChanges, setOpenChanges] = useState(false);
  const [openAttempts, setOpenAttempts] = useState(false);

  const moving = movingRows(draft.plan.rows);
  const flips = flipsSentence(draft.flips);
  const flipList = [...draft.flips.becameLate, ...draft.flips.becameOnTime];

  return (
    <DialogContent className="gap-0 p-0 sm:max-w-xl">
      <DialogHeader className="gap-3 px-6 pt-5">
        <VariantSwitch />
        <DialogTitle className="sr-only">Сдвинуть дедлайны</DialogTitle>
        <DialogDescription className="sr-only">
          Выберите Task, на сколько и для кого сдвинуть дедлайны
        </DialogDescription>
      </DialogHeader>

      <p className="px-6 pt-2 pb-5 text-xl leading-10 tracking-tight">
        Сдвинуть{' '}
        <TaskPicker
          draft={draft}
          trigger={
            <button type="button" className={TOKEN}>
              {taskSummary(draft)}
            </button>
          }
        />{' '}
        <Token label={daysLabel(draft.days)}>
          <div className="grid gap-3">
            <DaysStepper days={draft.days} onChange={draft.setDays} />
            <div className="flex flex-wrap gap-1">
              {[-7, -1, 1, 2, 7, 14].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => draft.setDays(value)}
                  className={cn(
                    'h-7 rounded-md border px-2 text-xs tabular-nums',
                    value === draft.days
                      ? 'border-foreground bg-foreground text-background'
                      : 'hover:bg-muted'
                  )}
                >
                  {value > 0 ? `+${value}` : `−${-value}`}
                </button>
              ))}
            </div>
          </div>
        </Token>{' '}
        <Token label={scopeLabel(draft)}>
          <div className="-mx-1 grid">
            {(Object.keys(SCOPE_WORDS) as ShiftScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => draft.setScope(scope)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                  draft.scope === scope && 'font-medium'
                )}
              >
                {SCOPE_WORDS[scope]}
              </button>
            ))}
            {draft.scope === 'groups' ? (
              <div className="flex flex-wrap gap-1 px-2 pt-2">
                {STUDENT_GROUPS.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={draft.groupIds.has(group.id)}
                    onClick={() =>
                      draft.setGroupIds(toggleIn(draft.groupIds, group.id))
                    }
                    className={cn(
                      'h-7 rounded-md border px-2 text-xs',
                      draft.groupIds.has(group.id)
                        ? 'border-sky-500/50 bg-sky-500/10'
                        : 'hover:bg-muted'
                    )}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Token>
        {draft.hasOpening && draft.scope !== 'groups' ? (
          <>
            {' '}
            <button
              type="button"
              aria-pressed={draft.includeOpening}
              onClick={() => draft.setIncludeOpening(!draft.includeOpening)}
              className={cn(
                TOKEN,
                !draft.includeOpening && 'font-normal text-muted-foreground/70'
              )}
            >
              {draft.includeOpening ? 'и время открытия' : '+ время открытия'}
            </button>
          </>
        ) : null}
        .
      </p>

      <div className="grid gap-2 px-6">
        <Unfold
          open={openChanges}
          onToggle={() => setOpenChanges(!openChanges)}
          summary={
            moving.length === 0
              ? 'Ничего не изменится'
              : `Изменится ${moving.length} ${plural(moving.length, 'значение', 'значения', 'значений')}`
          }
        >
          <ul className="grid max-h-56 gap-1 overflow-y-auto text-sm">
            {draft.orderedTaskIds.map((taskId) => {
              const rows = draft.plan.rows.filter(
                (row) =>
                  row.taskId === taskId &&
                  (row.kind === 'shift' || row.kind === 'create-override')
              );
              if (rows.length === 0) {
                return null;
              }
              return (
                <li key={taskId} className="grid gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {tasks[taskId]?.title}
                  </span>
                  {rows.map((row) => (
                    <label
                      key={row.key}
                      className={cn(
                        'flex items-center gap-2',
                        !row.included && 'text-muted-foreground'
                      )}
                    >
                      {row.excludable ? (
                        <Checkbox
                          checked={row.included}
                          onCheckedChange={() =>
                            draft.setExcluded(toggleIn(draft.excluded, row.key))
                          }
                        />
                      ) : (
                        <span className="size-4" />
                      )}
                      <span className="w-28 truncate">{rowWho(row)}</span>
                      <DeadlineText
                        compact
                        value={row.before}
                        defaultTime={
                          row.level === 'opening' ? '00:00' : '23:59'
                        }
                      />
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      <DeadlineText
                        compact
                        value={row.after}
                        defaultTime={
                          row.level === 'opening' ? '00:00' : '23:59'
                        }
                      />
                    </label>
                  ))}
                </li>
              );
            })}
          </ul>
        </Unfold>
        {flips ? (
          <Unfold
            tone="warn"
            open={openAttempts}
            onToggle={() => setOpenAttempts(!openAttempts)}
            summary={flips[0]!.toUpperCase() + flips.slice(1)}
          >
            <ul className="grid max-h-40 gap-1 overflow-y-auto text-xs">
              {flipList.map(({ attempt, after }) => (
                <li key={attempt.id} className="flex flex-wrap gap-x-2">
                  <span className="font-medium">
                    {studentName(studentsById.get(attempt.studentId)!)}
                  </span>
                  <span className="text-muted-foreground">
                    {tasks[attempt.taskId]?.title}, отправлена{' '}
                    {formatMoment(attempt.submittedAt)}
                  </span>
                  <span>
                    {after.kind === 'late'
                      ? `опоздает на ${formatDuration(after.by)}`
                      : 'станет вовремя'}
                  </span>
                </li>
              ))}
            </ul>
          </Unfold>
        ) : null}
      </div>

      <DialogFooter className="px-6 pt-4 pb-5">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button
          disabled={!draft.canApply || save.status === 'saving'}
          onClick={() => {
            draft.submit();
            onClose();
          }}
        >
          {save.status === 'saving' ? (
            <LoaderCircle className="animate-spin" />
          ) : null}
          {apply === 'batch' ? 'Добавить к неприменённым' : 'Сдвинуть'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
