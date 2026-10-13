// PROTOTYPE (#181): shift window «Вопрос». One question with three answers
// instead of a table (Blue Apron «this delivery / all deliveries», Google
// Calendar recurring events). Fine-grained choice stays one click away.
import type { ReactNode } from 'react';
import { ChevronDown, LoaderCircle, TriangleAlert } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import { cn } from '@/shadcn/lib/utils';
import {
  usePrototypeSettings,
  useUpdatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  STUDENT_GROUPS,
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatCompactMoment,
  shiftDays,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import {
  daysLabel,
  flipsSentence,
  movingRows,
  plural,
  taskSummary,
  toggleIn,
  useShiftDraft,
  type ShiftPreset,
  type ShiftScope,
} from './model';
import { DaysStepper, TaskPicker, VariantSwitch } from './parts';

function Answer({
  value,
  current,
  onSelect,
  title,
  detail,
  count,
  children,
}: {
  value: ShiftScope;
  current: ShiftScope;
  onSelect: (value: ShiftScope) => void;
  title: string;
  detail: string;
  count?: number;
  children?: ReactNode;
}) {
  const selected = value === current;

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        selected ? 'border-foreground/60 bg-muted/40' : 'hover:bg-muted/30'
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onSelect(value)}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
      >
        <span
          className={cn(
            'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
            selected ? 'border-foreground' : 'border-muted-foreground/50'
          )}
        >
          {selected ? (
            <span className="size-2 rounded-full bg-foreground" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        {count !== undefined ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {count} {plural(count, 'изменение', 'изменения', 'изменений')}
          </span>
        ) : null}
      </button>
      {selected && children ? (
        <div className="px-3 pb-3 pl-10">{children}</div>
      ) : null}
    </div>
  );
}

export function QuestionBody({
  preset,
  onClose,
}: {
  preset: ShiftPreset;
  onClose: () => void;
}) {
  const { apply } = usePrototypeSettings();
  const update = useUpdatePrototypeSearch();
  const save = useSandbox((state) => state.save);
  const schedule = useViewSchedule();
  const draft = useShiftDraft(preset);
  const ids = draft.orderedTaskIds;
  const single = ids.length === 1 ? schedule.tasks[ids[0]!] : undefined;

  const everything = movingRows(draft.scopePlans.everything.rows);
  const groupsMoving = everything.filter((row) => row.level === 'group').length;
  const studentsMoving = everything.filter(
    (row) => row.level === 'student'
  ).length;
  const flips = flipsSentence(draft.flips);

  const everythingDetail =
    groupsMoving + studentsMoving === 0
      ? 'Своих дедлайнов у групп и Students здесь нет'
      : `Общий дедлайн и свои дедлайны: ${[
          groupsMoving
            ? `${groupsMoving} ${plural(groupsMoving, 'группа', 'группы', 'групп')}`
            : null,
          studentsMoving
            ? `${studentsMoving} ${plural(studentsMoving, 'Student', 'Students', 'Students')}`
            : null,
        ]
          .filter(Boolean)
          .join(', ')}`;

  return (
    <DialogContent className="gap-0 p-0 sm:max-w-md">
      <DialogHeader className="gap-3 px-6 pt-5 pb-4">
        <VariantSwitch />
        <DialogTitle className="text-lg leading-snug">
          {ids.length === 0
            ? 'Какие Task сдвинуть?'
            : `Сдвинуть ${taskSummary(draft)} ${daysLabel(draft.days)}?`}
        </DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {single?.deadline.kind === 'at' ? (
              <span className="text-muted-foreground">
                Общий дедлайн{' '}
                <span className="line-through">
                  {formatCompactMoment(single.deadline.at)}
                </span>{' '}
                →{' '}
                <span className="font-medium text-foreground">
                  {formatCompactMoment(
                    shiftDays(single.deadline.at, draft.days)
                  )}
                </span>
              </span>
            ) : null}
            <span className="ml-auto flex items-center gap-2">
              <TaskPicker
                draft={draft}
                trigger={
                  <button
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-1 hover:text-foreground',
                      ids.length === 0
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {ids.length === 0 ? 'Выбрать Task' : 'Другие Task'}
                    <ChevronDown className="size-3.5" />
                  </button>
                }
              />
              <DaysStepper days={draft.days} onChange={draft.setDays} />
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div role="radiogroup" className="grid gap-2 px-6">
        <Answer
          value="everything"
          current={draft.scope}
          onSelect={draft.setScope}
          title="Всё вместе"
          detail={everythingDetail}
          count={everything.length}
        />
        <Answer
          value="general-only"
          current={draft.scope}
          onSelect={draft.setScope}
          title="Только общий дедлайн"
          detail="Группы и Students со своими дедлайнами останутся как есть"
          count={movingRows(draft.scopePlans['general-only'].rows).length}
        />
        <Answer
          value="groups"
          current={draft.scope}
          onSelect={draft.setScope}
          title="Только для отдельных групп"
          detail="Общий дедлайн и остальные группы не изменятся"
        >
          <div className="flex flex-wrap gap-1.5">
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
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-900 dark:text-sky-200'
                    : 'bg-background hover:bg-muted'
                )}
              >
                {group.name}
              </button>
            ))}
          </div>
        </Answer>
      </div>

      <div className="grid gap-2 px-6 pt-3 text-sm">
        {draft.hasOpening && draft.scope !== 'groups' ? (
          <label className="flex items-center gap-2 text-muted-foreground">
            <Checkbox
              checked={draft.includeOpening}
              onCheckedChange={(value) =>
                draft.setIncludeOpening(value === true)
              }
            />
            И время открытия
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => update({ shift: 'table' })}
          className="w-fit text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Выбрать каждое значение отдельно
        </button>
        {flips ? (
          <p className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {flips[0]!.toUpperCase() + flips.slice(1)}
          </p>
        ) : null}
      </div>

      <DialogFooter className="items-center px-6 pt-4 pb-5">
        <div className="flex gap-2">
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
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
