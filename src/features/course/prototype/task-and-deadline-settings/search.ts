// PROTOTYPE (#181): the variant on screen and the open Task. The URL carries
// only `?variant` (to pick between variants of one route) and `?task`; a
// route without `?variant` shows its default variant while #181 is switched
// on in the prototype bar.
import { useCallback } from 'react';
import { useMatches, useNavigate, useSearch } from '@tanstack/react-router';

import { usePrototypeActive } from '@/app/prototypes/active';
import { useSandboxSwitches, type SandboxSwitches } from './settings';

export type PrototypeSearch = {
  variant?: string;
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

/** What a route shows without `?variant`; the course page follows the verdict. */
const DEFAULT_VARIANT: Record<VariantRoute, VariantKey> = {
  course: 'dock',
  deadlines: 'A',
  tasks: 'B',
  edit: 'C',
};

const ROUTE_IDS: Partial<Record<string, VariantRoute>> = {
  '/_authenticated/courses/$courseSlug/': 'course',
  '/_authenticated/courses/$courseSlug/deadlines': 'deadlines',
  '/_authenticated/courses/$courseSlug/tasks/': 'tasks',
  '/_authenticated/courses/$courseSlug/edit': 'edit',
};

export function validatePrototypeSearch(
  search: Record<string, unknown>
): PrototypeSearch {
  return {
    ...(typeof search.variant === 'string' ? { variant: search.variant } : {}),
    ...(typeof search.task === 'string' ? { task: search.task } : {}),
  };
}

function useVariantRoute(): VariantRoute | undefined {
  return useMatches({
    select: (matches) =>
      matches
        .map((match) => ROUTE_IDS[match.routeId])
        .find((route) => route !== undefined),
  });
}

/** The variant shown on the current page, or undefined when #181 is off. */
export function useCurrentVariant(): VariantKey | undefined {
  const active = usePrototypeActive('task-deadlines');
  const route = useVariantRoute();
  const search = useSearch({ strict: false }) as PrototypeSearch;

  if (!active || !route) {
    return undefined;
  }

  const requested = VARIANTS.find(
    (variant) => variant.key === search.variant && variant.route === route
  );

  return requested?.key ?? DEFAULT_VARIANT[route];
}

export type PrototypeSettings = SandboxSwitches & {
  variant: VariantKey | undefined;
  task: string | undefined;
};

export function usePrototypeSettings(): PrototypeSettings {
  const search = useSearch({ strict: false }) as PrototypeSearch;
  const variant = useCurrentVariant();
  const apply = useSandboxSwitches((state) => state.apply);
  const taskApply = useSandboxSwitches((state) => state.taskApply);
  const deadlineField = useSandboxSwitches((state) => state.deadlineField);
  const statement = useSandboxSwitches((state) => state.statement);
  const shift = useSandboxSwitches((state) => state.shift);
  const picker = useSandboxSwitches((state) => state.picker);
  const panelLook = useSandboxSwitches((state) => state.panelLook);

  return {
    variant,
    apply,
    taskApply,
    deadlineField,
    statement,
    shift,
    picker,
    panelLook,
    task: search.task,
  };
}

type PrototypePatch = Partial<SandboxSwitches> & { task?: string };

/**
 * Changes sandbox switches and the open Task; the Task goes to the URL of
 * the current route, keeping the rest of it.
 */
export function useUpdatePrototypeSearch() {
  const navigate = useNavigate();
  const setSwitches = useSandboxSwitches((state) => state.setSwitches);

  return useCallback(
    (patch: PrototypePatch) => {
      const { task, ...switches } = patch;
      setSwitches(switches);

      if (!('task' in patch)) {
        return;
      }

      void navigate({
        to: '.',
        replace: true,
        resetScroll: false,
        search: ((previous: Record<string, unknown>) => {
          const next = { ...previous, task };
          if (task === undefined) {
            delete next.task;
          }
          return next;
        }) as never,
      });
    },
    [navigate, setSwitches]
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
    (key: VariantKey, extra: PrototypeSearch = {}) => {
      const variant = VARIANTS.find((item) => item.key === key)!;

      void navigate({
        to: ROUTE_PATHS[variant.route],
        params: { courseSlug },
        search: ((previous: PrototypeSearch) => ({
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
