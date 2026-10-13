// PROTOTYPE (#181): shift window «Вопрос», refined after review. Kinds of
// deadlines are ticked independently (no «всё вместе»), Student Groups are
// picked by buttons in the window, days come from buttons as in «Сразу».
// Nothing appears or disappears while ticking, so the window stays put.
import { Fragment, type ReactNode } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
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
import {
  daysLabel,
  plural,
  taskSummary,
  toggleIn,
  type ShiftPreset,
} from './model';
import { DaysPicker, TaskPicker, VariantSwitch } from './parts';

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
      {children ? (
        <div
          aria-disabled={!checked}
          className={cn(
            'pl-6.5 transition-opacity',
            !checked && 'pointer-events-none opacity-40'
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** What an inheriting or empty subgroup will do, said on hover. */
function groupExplanation(state: string | null, days: number) {
  switch (state) {
    case 'как общий':
      return 'У подгруппы нет своего дедлайна, действует общий. Отметьте, чтобы сдвинуть её отдельно: у неё появится свой дедлайн, а общий останется как есть.';
    case 'получит свой':
      return `Сейчас у подгруппы нет своего дедлайна. После сдвига у неё появится свой — ${daysLabel(days)} общего, а общий не изменится.`;
    case 'вместе с общим':
      return 'У подгруппы нет своего дедлайна, действует общий. Общий сдвигается, поэтому её дедлайн сдвинется вместе с ним.';
    case 'без дедлайна':
      return 'У подгруппы явно задано «без дедлайна». Такие значения не сдвигаются.';
    default:
      return null;
  }
}

function groupState(draft: KindsDraft, single: string | null, groupId: string) {
  const override = single
    ? findOverride(draft.schedule, single, { kind: 'group', groupId })
    : undefined;
  const inherits = Boolean(single) && !override;
  const none = override?.value.kind === 'none';
  // With the general deadline moving, an inheriting group moves anyway.
  const follows = inherits && draft.kinds.general;
  return { override, inherits, none, follows, locked: none || follows };
}

function GroupButtons({ draft }: { draft: KindsDraft }) {
  const single =
    draft.orderedTaskIds.length === 1 ? draft.orderedTaskIds[0]! : null;
  const toggleable = STUDENT_GROUPS.filter(
    (group) => !groupState(draft, single, group.id).locked
  ).map((group) => group.id);

  function toggle(groupId: string) {
    const next = toggleIn(draft.groupIds, groupId);
    // Nothing left to move: untick «Дедлайны подгрупп» instead of leaving
    // a ticked box that moves nothing.
    if (toggleable.every((id) => !next.has(id))) {
      draft.setGroupIds(new Set());
      draft.setKind('groups', false);
      return;
    }
    draft.setGroupIds(next);
  }

  return (
    // Inside a modal the «move onto the tooltip» grace area never ends, so
    // the tooltip closes as soon as the pointer leaves the button.
    <TooltipProvider delayDuration={150} disableHoverableContent>
      <div className="flex flex-wrap gap-1.5">
        {STUDENT_GROUPS.map((group) => {
          // Locked groups are not toggled but still show their explanation.
          const { override, inherits, none, follows, locked } = groupState(
            draft,
            single,
            group.id
          );
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
          const explanation = groupExplanation(hint, draft.days);

          const button = (
            <button
              type="button"
              aria-disabled={locked}
              aria-pressed={selected || follows}
              onClick={() => {
                if (!locked) {
                  toggle(group.id);
                }
              }}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
                locked
                  ? cn(
                      'cursor-help border-dashed text-muted-foreground',
                      none && 'text-muted-foreground/60'
                    )
                  : selected
                    ? cn(
                        'cursor-pointer border-sky-500/50 bg-sky-500/10 text-sky-950',
                        'hover:border-sky-500/80 hover:bg-sky-500/20 dark:text-sky-100'
                      )
                    : cn(
                        'cursor-pointer text-muted-foreground',
                        'hover:border-foreground/30 hover:bg-muted hover:text-foreground'
                      )
              )}
            >
              {group.name}
              {hint ? (
                <span
                  className={cn(
                    'text-xs text-muted-foreground',
                    explanation &&
                      'underline decoration-dotted underline-offset-2'
                  )}
                >
                  {hint}
                </span>
              ) : null}
            </button>
          );

          return explanation ? (
            <Tooltip key={group.id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 text-left">
                {explanation}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Fragment key={group.id}>{button}</Fragment>
          );
        })}
        {single === null ? (
          <span className="self-center text-xs text-muted-foreground">
            Отмеченные подгруппы сдвинутся во всех выбранных Task
          </span>
        ) : null}
      </div>
    </TooltipProvider>
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
      </div>

      <DialogFooter className="items-center gap-3 border-t px-6 py-3 sm:justify-between">
        <span
          aria-live="polite"
          className={cn(
            // Two lines reserved, so a wrapping line does not resize the window.
            'flex min-h-10 items-center gap-1.5 text-sm',
            draft.blocked
              ? 'text-muted-foreground'
              : 'text-amber-800 dark:text-amber-300'
          )}
        >
          {draft.blocked ??
            (draft.flips ? (
              <>
                <TriangleAlert className="size-4 shrink-0" />
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
