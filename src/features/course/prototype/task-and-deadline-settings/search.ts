// PROTOTYPE (#181): URL switches shared by every route of the sandbox.
import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

export type ApplyMode = 'instant' | 'batch';
/**
 * How Task edits are applied (#129): A — through the Course Draft Snapshot;
 * D — a Task publication with a version check; `contract` — the contract
 * from #129: D for published Tasks, new Tasks live in the draft.
 */
export type TaskApplyMode = 'course' | 'task' | 'contract';
export type DeadlineFieldMode = 'counter' | 'full';
export type StatementMode = 'panel' | 'inline' | 'expanded';
export type ShiftVariant = 'question' | 'sentence' | 'undo' | 'table';
export type PickerLayout = 'stack' | 'split';
export type PanelLook = 'list' | 'cards';

export const SHIFT_VARIANTS: ReadonlyArray<{
  value: ShiftVariant;
  label: string;
}> = [
  { value: 'question', label: 'Вопрос' },
  { value: 'sentence', label: 'Фраза' },
  { value: 'undo', label: 'Сразу' },
  { value: 'table', label: 'Таблица' },
];

export type PrototypeSearch = {
  variant?: string;
  apply?: ApplyMode;
  taskApply?: TaskApplyMode;
  deadlineField?: DeadlineFieldMode;
  statement?: StatementMode;
  /** Which mass-shift window to show. */
  shift?: ShiftVariant;
  /** How the date popover of a deadline or an opening time is laid out. */
  picker?: PickerLayout;
  /** Task panel sections: divided by lines or as cards. */
  panelLook?: PanelLook;
  /** The Task whose panel is open. */
  task?: string;
};

export type VariantRoute = 'course' | 'deadlines' | 'tasks' | 'edit';

export const VARIANTS = [
  { key: 'overlay', name: 'Панель поверх страницы курса', route: 'course' },
  { key: 'dock', name: 'Панель рядом со страницей курса', route: 'course' },
  {
    key: 'A',
    name: 'Дедлайны: матрица задания × подгруппы',
    route: 'deadlines',
  },
  { key: 'B', name: 'Дедлайны: список заданий и панель', route: 'tasks' },
  { key: 'C', name: 'Дедлайны в редакторе страницы курса', route: 'edit' },
  { key: 'D', name: 'Дедлайны: таймлайн', route: 'deadlines' },
] as const satisfies ReadonlyArray<{
  key: string;
  name: string;
  route: VariantRoute;
}>;

export type VariantKey = (typeof VARIANTS)[number]['key'];

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export function validatePrototypeSearch(
  search: Record<string, unknown>
): PrototypeSearch {
  const variant =
    typeof search.variant === 'string' ? search.variant : undefined;

  return {
    ...(variant ? { variant } : {}),
    ...withValue('apply', pick(search.apply, ['instant', 'batch'] as const)),
    ...withValue(
      'taskApply',
      pick(search.taskApply, ['course', 'task', 'contract'] as const)
    ),
    ...withValue(
      'deadlineField',
      pick(search.deadlineField, ['counter', 'full'] as const)
    ),
    ...withValue(
      'statement',
      pick(search.statement, ['panel', 'inline', 'expanded'] as const)
    ),
    ...withValue(
      'shift',
      pick(search.shift, ['question', 'sentence', 'undo', 'table'] as const)
    ),
    ...withValue('picker', pick(search.picker, ['stack', 'split'] as const)),
    ...withValue(
      'panelLook',
      pick(search.panelLook, ['list', 'cards'] as const)
    ),
    ...withValue(
      'task',
      typeof search.task === 'string' ? search.task : undefined
    ),
  };
}

function withValue<K extends string, V>(key: K, value: V | undefined) {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

export type PrototypeSettings = {
  variant: string | undefined;
  apply: ApplyMode;
  taskApply: TaskApplyMode;
  deadlineField: DeadlineFieldMode;
  statement: StatementMode;
  shift: ShiftVariant;
  picker: PickerLayout;
  panelLook: PanelLook;
  task: string | undefined;
};

export function usePrototypeSettings(): PrototypeSettings {
  const search = useSearch({ strict: false }) as PrototypeSearch;

  return {
    variant: search.variant,
    apply: search.apply ?? 'batch',
    taskApply: search.taskApply ?? 'course',
    // Verdict 13.10.2026: a Task's overrides are visible in its panel too.
    deadlineField: search.deadlineField ?? 'full',
    statement: search.statement ?? 'panel',
    shift: search.shift ?? 'question',
    // Verdict 13.10.2026: the two-column date popover.
    picker: search.picker ?? 'split',
    // Verdict 13.10.2026: panel sections divided by lines.
    panelLook: search.panelLook ?? 'list',
    task: search.task,
  };
}

/** Changes switches on the current route, keeping the rest of the URL. */
export function useUpdatePrototypeSearch() {
  const navigate = useNavigate();

  return useCallback(
    (patch: Partial<PrototypeSearch>) => {
      void navigate({
        to: '.',
        replace: true,
        resetScroll: false,
        search: ((previous: PrototypeSearch) => {
          const next: Record<string, unknown> = { ...previous, ...patch };
          for (const key of Object.keys(next)) {
            if (next[key] === undefined) {
              delete next[key];
            }
          }
          return next;
        }) as never,
      });
    },
    [navigate]
  );
}

const ROUTE_PATHS = {
  course: '/courses/$courseSlug',
  deadlines: '/courses/$courseSlug/deadlines',
  tasks: '/courses/$courseSlug/tasks',
  edit: '/courses/$courseSlug/edit',
} as const;

export function useOpenVariant(courseSlug: string) {
  const navigate = useNavigate();

  return useCallback(
    (key: VariantKey, extra: Partial<PrototypeSearch> = {}) => {
      const variant = VARIANTS.find((item) => item.key === key)!;

      void navigate({
        to: ROUTE_PATHS[variant.route],
        params: { courseSlug },
        search: ((previous: PrototypeSearch) => ({
          ...(previous.apply ? { apply: previous.apply } : {}),
          ...(previous.taskApply ? { taskApply: previous.taskApply } : {}),
          ...(previous.deadlineField
            ? { deadlineField: previous.deadlineField }
            : {}),
          ...(previous.statement ? { statement: previous.statement } : {}),
          ...(previous.shift ? { shift: previous.shift } : {}),
          ...(previous.picker ? { picker: previous.picker } : {}),
          ...(previous.panelLook ? { panelLook: previous.panelLook } : {}),
          // The same Task stays selected across variants.
          ...(previous.task ? { task: previous.task } : {}),
          ...extra,
          variant: key,
        })) as never,
      });
    },
    [courseSlug, navigate]
  );
}
