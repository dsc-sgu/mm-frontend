// PROTOTYPE (#181): shift window «Сразу». No confirmation: a drag on the
// timeline applies at once, the button opens a short menu of shifts, and a
// toast offers «Отменить» (Coda, Proton). Undo puts every moved value back.
import { useEffect, useRef } from 'react';

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import { cn } from '@/shadcn/lib/utils';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  ATTEMPTS,
  STUDENTS,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  applyCommands,
  latenessChanges,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { Segmented } from '@/features/course/prototype/task-and-deadline-settings/ui/segmented';
import {
  daysLabel,
  flipsSentence,
  inverseOf,
  movingRows,
  planFor,
  plural,
  taskSummary,
  useShiftDraft,
  type ShiftDraft,
  type ShiftPreset,
} from './model';
import { TaskPicker, VariantSwitch } from './parts';
import { useShiftToast } from './toast-store';

function useApplyShift() {
  const { apply } = usePrototypeSettings();
  const schedule = useViewSchedule();
  const edit = useScheduleEdit();
  const show = useShiftToast((state) => state.show);

  return (draft: ShiftDraft, days: number) => {
    const plan = planFor(
      schedule,
      draft.orderedTaskIds,
      draft.scope,
      draft.groupIds,
      days,
      draft.includeOpening,
      new Set()
    );
    const moving = movingRows(plan.rows);

    if (moving.length === 0) {
      return;
    }

    const flips = flipsSentence(
      latenessChanges(
        schedule,
        applyCommands(schedule, plan.commands),
        ATTEMPTS.filter((attempt) =>
          draft.orderedTaskIds.includes(attempt.taskId)
        ),
        STUDENTS
      )
    );
    const what = `${taskSummary(draft)}: ${moving.length} ${plural(moving.length, 'значение', 'значения', 'значений')}`;

    edit(plan.commands, `сдвиг ${daysLabel(days)}: ${what}`);
    show({
      title:
        apply === 'batch'
          ? `Сдвиг ${daysLabel(days)} добавлен к неприменённым`
          : `Дедлайны сдвинуты ${daysLabel(days)}`,
      detail: [what, flips].filter(Boolean).join('. '),
      undo: inverseOf(plan.rows),
      undoLabel: `отмена сдвига ${daysLabel(days)}`,
    });
  };
}

/** A drag on the timeline: apply at once, then close. */
export function ApplyNow({
  preset,
  onApplied,
}: {
  preset: ShiftPreset;
  /** After a shift went through; closes the window. */
  onApplied: () => void;
}) {
  const draft = useShiftDraft(preset);
  const applyShift = useApplyShift();
  const done = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice; the shift must apply once.
    if (done.current) {
      return;
    }
    done.current = true;
    applyShift(draft, preset.days ?? 0);
    onApplied();
  });

  return null;
}

const STEPS = [-7, -1, 1, 2, 7, 14];

/** The button: a short menu where one click shifts. */
export function QuickShiftBody({
  preset,
  onApplied,
}: {
  preset: ShiftPreset;
  /** After a shift went through; closes the window. */
  onApplied: () => void;
}) {
  const draft = useShiftDraft(preset);
  const applyShift = useApplyShift();
  const ready = draft.orderedTaskIds.length > 0;

  return (
    <DialogContent className="gap-4 sm:max-w-sm">
      <DialogHeader className="gap-3">
        <VariantSwitch />
        <DialogTitle>Сдвинуть дедлайны</DialogTitle>
        <DialogDescription asChild>
          <div className="text-sm">
            <TaskPicker
              draft={draft}
              trigger={
                <button
                  type="button"
                  className="rounded-sm border-b border-dashed border-foreground/40 text-foreground"
                >
                  {taskSummary(draft)}
                </button>
              }
            />
            <span className="text-muted-foreground">
              {' '}
              — выберите, на сколько. Отменить можно сразу после.
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>
      <Segmented
        value={draft.scope === 'general-only' ? 'general-only' : 'everything'}
        onChange={draft.setScope}
        label="Что сдвигать"
        options={[
          { value: 'everything', label: 'Всё вместе' },
          { value: 'general-only', label: 'Только общий дедлайн' },
        ]}
      />
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map((days) => (
          <button
            key={days}
            type="button"
            disabled={!ready}
            onClick={() => {
              applyShift(draft, days);
              onApplied();
            }}
            className={cn(
              'h-14 rounded-lg border text-sm tabular-nums transition-colors',
              'hover:border-foreground/40 hover:bg-muted disabled:opacity-50',
              days > 0 ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {days > 0 ? `+${days}` : `−${-days}`}{' '}
            {plural(days, 'день', 'дня', 'дней')}
          </button>
        ))}
      </div>
    </DialogContent>
  );
}
