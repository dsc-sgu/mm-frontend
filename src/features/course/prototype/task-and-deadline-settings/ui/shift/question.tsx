// PROTOTYPE (#181): shift window «Вопрос», refined after review. Kinds of
// deadlines are ticked independently (no «всё вместе»), Student Groups are
// picked right in the window, days come from buttons as in «Сразу», and a
// read-only sentence from «Фраза» says what will happen.
import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

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
import { findOverride } from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  STUDENT_GROUPS,
  useSandbox,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatCompactMoment,
  shiftDays,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { useKindsDraft, type KindsDraft, type ShiftKinds } from './kinds';
import { plural, toggleIn, type ShiftPreset } from './model';
import { DaysPicker, TaskChooser, VariantSwitch } from './parts';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

function KindRow({
  draft,
  kind,
  label,
  meta,
  disabled = false,
  children,
}: {
  draft: KindsDraft;
  kind: keyof ShiftKinds;
  label: string;
  meta?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const checked = draft.kinds[kind] && !disabled;

  return (
    <div className="grid gap-2">
      <label
        className={cn(
          'flex items-center gap-2.5 text-sm',
          disabled && 'text-muted-foreground'
        )}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => draft.setKind(kind, value === true)}
        />
        <span className="flex-1">{label}</span>
        {meta ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {meta}
          </span>
        ) : null}
      </label>
      {checked && children ? <div className="pl-6.5">{children}</div> : null}
    </div>
  );
}

function GroupButtons({ draft }: { draft: KindsDraft }) {
  const single =
    draft.orderedTaskIds.length === 1 ? draft.orderedTaskIds[0]! : null;
  const task = single ? draft.schedule.tasks[single] : undefined;

  return (
    <div className="flex flex-wrap gap-1.5">
      {STUDENT_GROUPS.map((group) => {
        const override = single
          ? findOverride(draft.schedule, single, {
              kind: 'group',
              groupId: group.id,
            })
          : undefined;
        const inherits = Boolean(single) && !override;
        const none = override?.value.kind === 'none';
        // With the general deadline moving, an inheriting group moves anyway.
        const follows = inherits && draft.kinds.general;
        const selected = draft.groupIds.has(group.id) && !none;
        const hint = !single
          ? null
          : none
            ? 'без дедлайна'
            : follows
              ? 'вместе с общим'
              : inherits
                ? selected
                  ? 'получит свой'
                  : 'как общий'
                : override?.value.kind === 'at'
                  ? formatCompactMoment(override.value.at)
                  : null;

        return (
          <button
            key={group.id}
            type="button"
            disabled={none || follows}
            aria-pressed={selected || follows}
            onClick={() =>
              draft.setGroupIds(toggleIn(draft.groupIds, group.id))
            }
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm',
              'disabled:cursor-default',
              follows
                ? 'border-dashed text-muted-foreground'
                : none
                  ? 'border-dashed text-muted-foreground/60'
                  : selected
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-950 dark:text-sky-100'
                    : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {group.name}
            {hint ? (
              <span className="text-xs text-muted-foreground">{hint}</span>
            ) : null}
          </button>
        );
      })}
      {task === undefined && single === null ? (
        <span className="self-center text-xs text-muted-foreground">
          Отмеченные подгруппы сдвинутся во всех выбранных Task
        </span>
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
  const save = useSandbox((state) => state.save);
  const draft = useKindsDraft(preset);
  const ids = draft.orderedTaskIds;
  const single = ids.length === 1 ? draft.schedule.tasks[ids[0]!] : undefined;
  const opening =
    single?.openingTime !== null && single?.openingTime !== undefined
      ? single.openingTime
      : null;

  const generalMeta =
    single?.deadline.kind === 'at'
      ? `${formatCompactMoment(single.deadline.at)} → ${formatCompactMoment(shiftDays(single.deadline.at, draft.days))}`
      : single
        ? 'без дедлайна'
        : ids.length > 1
          ? `${ids.length} Task`
          : null;

  return (
    <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-xl">
      <DialogHeader className="gap-3 px-6 pt-5 pb-4">
        <VariantSwitch />
        <DialogTitle className="text-lg">Сдвинуть дедлайны</DialogTitle>
        <DialogDescription className="sr-only">
          Выберите Task, на сколько дней и какие дедлайны сдвинуть
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-5 overflow-y-auto px-6 pb-5">
        <Section title="Task">
          <TaskChooser
            groups={draft.groups}
            taskIds={draft.taskIds}
            onChange={draft.setTaskIds}
          />
        </Section>

        <Section title="На сколько">
          <DaysPicker days={draft.days} onChange={draft.setDays} />
        </Section>

        <Section title="Что сдвинуть">
          <div className="grid gap-3">
            <KindRow
              draft={draft}
              kind="general"
              label="Общие дедлайны"
              meta={generalMeta}
            />
            <KindRow
              draft={draft}
              kind="groups"
              label="Дедлайны подгрупп"
              meta={
                draft.kinds.groups && draft.counts.groups > 0
                  ? `${draft.counts.groups} ${plural(draft.counts.groups, 'изменение', 'изменения', 'изменений')}`
                  : null
              }
            >
              <GroupButtons draft={draft} />
            </KindRow>
            <KindRow
              draft={draft}
              kind="students"
              label="Индивидуальные дедлайны студентов"
              disabled={ids.length > 0 && draft.counts.personalTotal === 0}
              meta={
                ids.length === 0
                  ? null
                  : draft.counts.personalTotal === 0
                    ? 'нет'
                    : `${draft.counts.personalTotal} ${plural(draft.counts.personalTotal, 'студент', 'студента', 'студентов')}`
              }
            />
            {draft.hasOpening ? (
              <KindRow
                draft={draft}
                kind="opening"
                label="Время открытия"
                meta={
                  opening !== null
                    ? `${formatCompactMoment(opening, '00:00')} → ${formatCompactMoment(shiftDays(opening, draft.days), '00:00')}`
                    : null
                }
              />
            ) : null}
          </div>
        </Section>

        {ids.length > 0 ? (
          <p
            aria-live="polite"
            className="rounded-lg bg-muted/60 px-4 py-3 text-sm leading-6"
          >
            {draft.summary.join(' ')}
          </p>
        ) : null}
      </div>

      <DialogFooter className="items-center gap-3 border-t px-6 py-3 sm:justify-between">
        <span className="text-sm text-muted-foreground">{draft.blocked}</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={Boolean(draft.blocked) || save.status === 'saving'}
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
