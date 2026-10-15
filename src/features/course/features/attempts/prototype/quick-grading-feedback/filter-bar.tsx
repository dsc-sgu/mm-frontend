// PROTOTYPE (#121): normal-mode filter bar for Course Attempts, chosen over
// a per-pill apply (Airtable, DoorDash Merchant) and a "Фильтры" panel
// (GetYourGuide, Calendly); both are in this branch's history. Pills edit one
// shared draft and the bar applies it at once, like Unify and the current
// sidebar. It keeps the explicit-apply contract from #117: the URL owns
// applied filters, nothing refetches while a selection is being composed —
// "Оценено" included — and Mod+Enter applies.
//
// While the draft differs from the applied filters, the bar shows only the
// pending controls: the attempt count and "Быстрая оценка" would describe the
// applied list, not what the pills show, so they are hidden rather than
// disabled. Alt+G starts quick grading when nothing is pending.
import { formatGrade } from '@/features/course/model/grade';
import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Check, ChevronDown, Zap } from 'lucide-react';

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
import {
  GRADED_OPTIONS,
  appliedChips,
  gradedLabel,
  studentNames,
  summarize,
  taskTitles,
} from './filter-labels';
import {
  getAltKeyLabel,
  getModKeyLabel,
  isApplyShortcut,
  isStartQuickGradingShortcut,
} from './shortcuts';
import { BarFrame } from './top-bar';

type FilterBarProps = {
  applied: CourseAttemptsFilters;
  draft: CourseAttemptsFilters;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  count: number;
  loading: boolean;
  onDraftChange: (filters: CourseAttemptsFilters) => void;
  onApplyDraft: () => void;
  onReset: () => void;
  onStartQuickGrading: () => void;
};

export function FilterBar({
  applied,
  draft,
  tasks,
  students,
  count,
  loading,
  onDraftChange,
  onApplyDraft,
  onReset,
  onStartQuickGrading,
}: FilterBarProps) {
  const dirty = !areCourseAttemptsFiltersEqual(applied, draft);
  const anyDraft = appliedChips(draft, tasks, students).length > 0;
  const canStartQuickGrading = !dirty && !loading && count > 0;

  // Mod+Enter applies a pending draft; Alt+G starts quick grading when
  // nothing is pending.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (dirty && isApplyShortcut(event)) {
        event.preventDefault();
        onApplyDraft();
        return;
      }

      if (canStartQuickGrading && isStartQuickGradingShortcut(event)) {
        event.preventDefault();
        onStartQuickGrading();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canStartQuickGrading, dirty, onApplyDraft, onStartQuickGrading]);

  return (
    <BarFrame
      trailing={
        dirty ? (
          <>
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
          </>
        ) : (
          <>
            <span className="px-1 text-sm text-muted-foreground tabular-nums">
              {loading ? 'Загрузка…' : `Попыток: ${count}`}
            </span>
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={!canStartQuickGrading}
              onClick={onStartQuickGrading}
            >
              <Zap className="size-3.5" />
              Быстрая оценка
              <KbdGroup className="max-md:hidden">
                <Kbd>{getAltKeyLabel()}</Kbd>
                <Kbd>G</Kbd>
              </KbdGroup>
            </Button>
          </>
        )
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
        state={pillState(
          draft.graded !== applied.graded,
          draft.graded !== 'any'
        )}
        onPick={(graded) => onDraftChange({ ...draft, graded })}
      />
      {anyDraft ? <ResetAllButton onClick={onReset} /> : null}
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
          state={pillState(
            !sameValues(values, appliedValues),
            values.length > 0
          )}
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

// ── shared pieces ───────────────────────────────────────────────────────────

type Option = { value: string; label: string; hint?: string };

type PillState = 'idle' | 'active' | 'pending';

/** A draft that differs from the applied filter wins over its value. */
function pillState(pending: boolean, active: boolean): PillState {
  if (pending) {
    return 'pending';
  }

  return active ? 'active' : 'idle';
}

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

function taskOptions(tasks: readonly CourseAttemptTask[]): Option[] {
  return tasks.map((task) => ({
    value: task.id,
    label: task.title,
    hint: `${formatGrade(task.maxGrade)} б.`,
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
