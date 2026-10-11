// PROTOTYPE (#121): three structurally different filter bars for normal-mode
// Course Attempts, switched with `?variant=1|2|3`. All keep the explicit-apply
// contract from #117: the URL owns applied filters, nothing refetches while a
// selection is being composed, and Mod+Enter applies.
// 1 — every pill has its own popover with "Применить" (Airtable, DoorDash
//     Merchant); a draft lives only while its popover is open.
// 2 — pills edit one shared draft, the bar applies it at once (Unify); the
//     current sidebar semantics in a row.
// 3 — one "Фильтры" panel with the current sidebar content, applied filters
//     as removable chips next to it (GetYourGuide, Calendly, Twenty).
import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Check, ChevronDown, SlidersHorizontal, X, Zap } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shadcn/components/ui/command';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import { areCourseAttemptsFiltersEqual } from '@/features/course/features/attempts/model/filters';
import type {
  CourseAttemptGradedFilter,
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';
import { AttemptsFiltersContent } from '@/features/course/features/attempts/ui/sidebar';
import {
  GRADED_OPTIONS,
  appliedChips,
  gradedLabel,
  studentNames,
  summarize,
  taskTitles,
  withoutFilter,
} from './filter-labels';
import { getModKeyLabel, isApplyShortcut } from './shortcuts';
import { BarFrame, Chip } from './top-bar';

export type FilterBarVariant = '1' | '2' | '3';

type FilterBarProps = {
  variant: FilterBarVariant;
  applied: CourseAttemptsFilters;
  draft: CourseAttemptsFilters;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  count: number;
  loading: boolean;
  onDraftChange: (filters: CourseAttemptsFilters) => void;
  onApplyDraft: () => void;
  onApply: (filters: CourseAttemptsFilters) => void;
  onReset: () => void;
  onStartQuickGrading: () => void;
};

export function FilterBar(props: FilterBarProps) {
  switch (props.variant) {
    case '1':
      return <PerFilterApplyBar {...props} />;
    case '2':
      return <SharedDraftBar {...props} />;
    case '3':
      return <PanelBar {...props} />;
  }
}

// ── 1: apply inside every pill ──────────────────────────────────────────────

function PerFilterApplyBar(props: FilterBarProps) {
  const { applied, tasks, students, onApply, onReset } = props;
  const anyApplied = appliedChips(applied, tasks, students).length > 0;

  return (
    <BarFrame trailing={<Trailing {...props} />}>
      <ApplyingListFilter
        label="Задания"
        placeholder="Найти задание"
        options={taskOptions(tasks)}
        applied={applied.tasks}
        summary={(values) => summarize(taskTitles(values, tasks))}
        onApply={(values) => onApply({ ...applied, tasks: values })}
      />
      <ApplyingListFilter
        label="Студенты"
        placeholder="Найти студента или группу"
        options={studentOptions(students)}
        applied={applied.students}
        summary={(values) => summarize(studentNames(values, students))}
        onApply={(values) => onApply({ ...applied, students: values })}
      />
      <GradedFilter
        value={applied.graded}
        state={applied.graded === 'any' ? 'idle' : 'active'}
        onPick={(graded) => onApply({ ...applied, graded })}
      />
      {anyApplied ? <ResetAllButton onClick={onReset} /> : null}
    </BarFrame>
  );
}

function ApplyingListFilter({
  label,
  placeholder,
  options,
  applied,
  summary,
  onApply,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  applied: string[];
  summary: (values: string[]) => string;
  onApply: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(applied);
  const dirty = !sameValues(local, applied);
  const apply = () => {
    onApply(local);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setLocal(applied);
        }

        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <FilterPill
          label={label}
          selection={applied.length > 0 ? summary(applied) : null}
          state={applied.length > 0 ? 'active' : 'idle'}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-0"
        onKeyDownCapture={(event) => {
          if (isApplyShortcut(event)) {
            event.preventDefault();
            event.stopPropagation();

            if (dirty) {
              apply();
            }
          }
        }}
      >
        <OptionsList
          placeholder={placeholder}
          options={options}
          selected={local}
          pinned={applied}
          onToggle={(value) => setLocal(toggle(local, value))}
        />
        <PopoverFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={local.length === 0}
            onClick={() => setLocal([])}
          >
            Очистить
          </Button>
          <Button type="button" size="sm" disabled={!dirty} onClick={apply}>
            Применить
            <ApplyKeys />
          </Button>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
}

// ── 2: one shared draft, applied from the bar ───────────────────────────────

function SharedDraftBar(props: FilterBarProps) {
  const { applied, draft, tasks, students, onDraftChange, onApplyDraft } =
    props;
  const dirty = !areCourseAttemptsFiltersEqual(applied, draft);
  const anyDraft = appliedChips(draft, tasks, students).length > 0;

  // Mod+Enter anywhere on the page applies the pending draft.
  useEffect(() => {
    if (!dirty) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isApplyShortcut(event)) {
        event.preventDefault();
        onApplyDraft();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dirty, onApplyDraft]);

  return (
    <BarFrame
      trailing={
        <>
          {dirty ? (
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-amber-700 dark:text-amber-300">
                Фильтры изменены
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => onDraftChange(applied)}
              >
                Отменить
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={onApplyDraft}
              >
                Применить
                <ApplyKeys />
              </Button>
            </span>
          ) : null}
          <Trailing
            {...props}
            quickDisabledReason={
              dirty
                ? 'Сначала примените или отмените изменения фильтров'
                : undefined
            }
          />
        </>
      }
    >
      <DraftListFilter
        label="Задания"
        placeholder="Найти задание"
        options={taskOptions(tasks)}
        values={draft.tasks}
        appliedValues={applied.tasks}
        summary={(values) => summarize(taskTitles(values, tasks))}
        onChange={(values) => onDraftChange({ ...draft, tasks: values })}
        onApply={onApplyDraft}
      />
      <DraftListFilter
        label="Студенты"
        placeholder="Найти студента или группу"
        options={studentOptions(students)}
        values={draft.students}
        appliedValues={applied.students}
        summary={(values) => summarize(studentNames(values, students))}
        onChange={(values) => onDraftChange({ ...draft, students: values })}
        onApply={onApplyDraft}
      />
      <GradedFilter
        value={draft.graded}
        state={
          draft.graded !== applied.graded
            ? 'pending'
            : draft.graded === 'any'
              ? 'idle'
              : 'active'
        }
        onPick={(graded) => onDraftChange({ ...draft, graded })}
      />
      {anyDraft ? <ResetAllButton onClick={props.onReset} /> : null}
    </BarFrame>
  );
}

function DraftListFilter({
  label,
  placeholder,
  options,
  values,
  appliedValues,
  summary,
  onChange,
  onApply,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  values: string[];
  appliedValues: string[];
  summary: (values: string[]) => string;
  onChange: (values: string[]) => void;
  onApply: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(values);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setPinned(values);
        }

        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <FilterPill
          label={label}
          selection={values.length > 0 ? summary(values) : null}
          state={
            !sameValues(values, appliedValues)
              ? 'pending'
              : values.length > 0
                ? 'active'
                : 'idle'
          }
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-0"
        onKeyDownCapture={(event) => {
          if (isApplyShortcut(event)) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            onApply();
          }
        }}
      >
        <OptionsList
          placeholder={placeholder}
          options={options}
          selected={values}
          pinned={pinned}
          onToggle={(value) => onChange(toggle(values, value))}
        />
        <PopoverFooter>
          <span className="px-2 text-xs text-muted-foreground">
            Применится кнопкой в баре
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Готово
          </Button>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
}

// ── 3: one panel with the current sidebar content ───────────────────────────

function PanelBar(props: FilterBarProps) {
  const {
    applied,
    draft,
    tasks,
    students,
    count,
    loading,
    onDraftChange,
    onApplyDraft,
    onApply,
    onReset,
  } = props;
  const [open, setOpen] = useState(false);
  const chips = appliedChips(applied, tasks, students);

  return (
    <BarFrame trailing={<Trailing {...props} />}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          // Closing the panel without "Применить" drops the draft.
          if (!next) {
            onDraftChange(applied);
          }

          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-3"
          >
            <SlidersHorizontal className="size-3.5" />
            Фильтры
            {chips.length > 0 ? (
              <span
                className={cn(
                  'rounded-full bg-primary px-1.5 text-[11px] leading-4',
                  'text-primary-foreground'
                )}
              >
                {chips.length}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[22rem] p-4">
          <AttemptsFiltersContent
            idPrefix="bar"
            showHeader={false}
            panel={{
              appliedFilters: applied,
              draftFilters: draft,
              attemptsCount: count,
              loading,
              tasks: [...tasks],
              students: [...students],
              onDraftFiltersChange: onDraftChange,
              onApplyFilters: onApplyDraft,
              onResetFilters: onReset,
            }}
            onAfterApply={() => setOpen(false)}
            onAfterReset={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      {chips.length === 0 ? (
        <span className="px-1 text-xs text-muted-foreground">
          все попытки курса
        </span>
      ) : (
        chips.map((chip) => (
          <Chip key={chip.key} label={chip.label} value={chip.value}>
            <button
              type="button"
              aria-label={`Убрать фильтр «${chip.label}»`}
              title="Убрать фильтр"
              onClick={() => onApply(withoutFilter(applied, chip.key))}
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full',
                'text-muted-foreground hover:bg-foreground/10',
                'hover:text-foreground'
              )}
            >
              <X className="size-3" />
            </button>
          </Chip>
        ))
      )}
      {chips.length > 0 ? <ResetAllButton onClick={onReset} /> : null}
    </BarFrame>
  );
}

// ── shared pieces ───────────────────────────────────────────────────────────

type Option = { value: string; label: string; hint?: string };

type PillState = 'idle' | 'active' | 'pending';

const pillTone: Record<PillState, string | null> = {
  idle: null,
  active: 'border-primary/40 bg-primary/10 hover:bg-primary/15',
  pending: 'border-dashed border-amber-500/80',
};

function FilterPill({
  label,
  selection,
  emptyValue = 'все',
  state,
  className,
  ...props
}: {
  label: string;
  selection: string | null;
  emptyValue?: string;
  state: PillState;
} & ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      {...props}
      className={cn(
        'h-8 max-w-[18rem] gap-1 rounded-full px-3 font-normal',
        pillTone[state],
        className
      )}
    >
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span
        className={cn(
          'min-w-0 truncate',
          selection ? 'font-medium' : 'text-muted-foreground'
        )}
      >
        {selection ?? emptyValue}
      </span>
      {state === 'pending' ? (
        <span
          title="Изменено, но не применено"
          className="size-1.5 shrink-0 rounded-full bg-amber-500"
        />
      ) : null}
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
    </Button>
  );
}

function GradedFilter({
  value,
  state,
  onPick,
}: {
  value: CourseAttemptGradedFilter;
  state: PillState;
  onPick: (graded: CourseAttemptGradedFilter) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterPill
          label="Оценено"
          selection={value === 'any' ? null : gradedLabel(value)}
          emptyValue="неважно"
          state={state}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        <div role="radiogroup" aria-label="Оценено" className="grid">
          {GRADED_OPTIONS.map((option) => {
            const checked = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  onPick(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-left',
                  'text-sm hover:bg-accent',
                  checked ? 'font-medium' : null
                )}
              >
                <span
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-full border',
                    checked ? 'border-primary' : 'border-input'
                  )}
                >
                  {checked ? (
                    <span className="size-2 rounded-full bg-primary" />
                  ) : null}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionsList({
  placeholder,
  options,
  selected,
  pinned,
  onToggle,
}: {
  placeholder: string;
  options: Option[];
  selected: string[];
  pinned: string[];
  onToggle: (value: string) => void;
}) {
  // Plain substring search: cmdk's fuzzy match lets "БПИ-232" match every
  // group. Values selected when the popover opened go first and stay put while
  // the teacher toggles, so the list does not jump under the pointer.
  const [query, setQuery] = useState('');
  const needle = query.trim().toLocaleLowerCase('ru');
  const visible = [
    ...options.filter((option) => pinned.includes(option.value)),
    ...options.filter((option) => !pinned.includes(option.value)),
  ].filter(
    (option) =>
      needle === '' ||
      `${option.label} ${option.hint ?? ''}`
        .toLocaleLowerCase('ru')
        .includes(needle)
  );

  return (
    <Command shouldFilter={false} className="rounded-none bg-transparent">
      <CommandInput
        placeholder={placeholder}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-64">
        <CommandEmpty>Ничего не найдено</CommandEmpty>
        {visible.map((option) => {
          const checked = selected.includes(option.value);

          return (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={() => onToggle(option.value)}
            >
              <span
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-[4px] border',
                  checked
                    ? 'border-primary bg-primary'
                    : 'border-input bg-background'
                )}
              >
                {checked ? (
                  <Check className="size-3 text-primary-foreground" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.hint ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {option.hint}
                </span>
              ) : null}
            </CommandItem>
          );
        })}
      </CommandList>
    </Command>
  );
}

function PopoverFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t p-2">
      {children}
    </div>
  );
}

function ApplyKeys() {
  return (
    <KbdGroup>
      <Kbd>{getModKeyLabel()}</Kbd>
      <Kbd>↵</Kbd>
    </KbdGroup>
  );
}

function ResetAllButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 text-muted-foreground"
      onClick={onClick}
    >
      Сбросить всё
    </Button>
  );
}

function Trailing({
  count,
  loading,
  quickDisabledReason,
  onStartQuickGrading,
}: Pick<FilterBarProps, 'count' | 'loading' | 'onStartQuickGrading'> & {
  quickDisabledReason?: string;
}) {
  return (
    <>
      <span className="text-sm text-muted-foreground tabular-nums">
        {loading ? 'Загрузка…' : `Попыток: ${count}`}
      </span>
      <Button
        type="button"
        size="sm"
        className="h-8"
        disabled={Boolean(quickDisabledReason) || loading || count === 0}
        title={quickDisabledReason}
        onClick={onStartQuickGrading}
      >
        <Zap className="size-3.5" />
        Быстрая оценка
      </Button>
    </>
  );
}

function taskOptions(tasks: readonly CourseAttemptTask[]): Option[] {
  return tasks.map((task) => ({
    value: task.id,
    label: task.title,
    hint: `${task.maxScore} б.`,
  }));
}

function studentOptions(students: readonly CourseAttemptStudent[]): Option[] {
  return students.map((student) => ({
    value: student.username,
    label: student.fullName,
    hint: student.group,
  }));
}

function toggle(values: readonly string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function sameValues(first: readonly string[], second: readonly string[]) {
  return (
    first.length === second.length &&
    first.every((value) => second.includes(value))
  );
}
