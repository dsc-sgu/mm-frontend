// PROTOTYPE: the prototype bar on every page of a dev build. It switches one
// prototype on, opens its screen and holds that prototype's controls.
import { ChevronUp, FlaskConical } from 'lucide-react';
import { useMatches, useNavigate, useParams } from '@tanstack/react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shadcn/components/ui/dropdown-menu';
import { cn } from '@/shadcn/lib/utils';
import { SandboxControls } from '@/features/course/prototype/task-and-deadline-settings/sandbox-bar';
import { useActivePrototype, useActivePrototypeStore } from './active';
import { PROTOTYPES, SANDBOX_COURSE_SLUG, type PrototypeId } from './registry';
import { useBarSlot } from './slot';

const OFF = 'off';

const PROTOTYPE_ONLY_ROUTES: readonly string[] = [
  '/_authenticated/courses/$courseSlug/deadlines',
  '/_authenticated/courses/$courseSlug/tasks/',
];

const SCREEN_ROUTES: Record<PrototypeId, readonly string[]> = {
  'quick-grading': ['/_authenticated/courses/$courseSlug/attempts'],
  'task-deadlines': [
    '/_authenticated/courses/$courseSlug/',
    '/_authenticated/courses/$courseSlug/edit',
    ...PROTOTYPE_ONLY_ROUTES,
  ],
};

const OPEN_LABEL: Record<PrototypeId, string> = {
  'quick-grading': 'Открыть попытки курса',
  'task-deadlines': 'Открыть курс-песочницу',
};

export function PrototypeBar() {
  const active = useActivePrototype();
  const setActive = useActivePrototypeStore((state) => state.setActive);
  const setSlot = useBarSlot((state) => state.setElement);
  const routeIds = useMatches({
    select: (matches) => matches.map((match) => match.routeId as string),
  });
  const { courseSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const current = PROTOTYPES.find((prototype) => prototype.id === active);

  /** Whether the current page is one of the prototype's screens. */
  function onScreen(id: PrototypeId): boolean {
    const onRoute = routeIds.some((routeId) =>
      SCREEN_ROUTES[id].includes(routeId)
    );
    // Only the sandbox Course has the #181 fixture Page.
    return id === 'task-deadlines'
      ? onRoute && courseSlug === SANDBOX_COURSE_SLUG
      : onRoute;
  }

  function open(id: PrototypeId) {
    switch (id) {
      case 'quick-grading':
        void navigate({
          to: '/courses/$courseSlug/attempts',
          params: { courseSlug: courseSlug ?? SANDBOX_COURSE_SLUG },
        });
        return;
      case 'task-deadlines':
        void navigate({
          to: '/courses/$courseSlug',
          params: { courseSlug: SANDBOX_COURSE_SLUG },
        });
        return;
    }
  }

  function choose(value: string) {
    const next = PROTOTYPES.find((prototype) => prototype.id === value);
    setActive(next?.id ?? null);

    if (next && !onScreen(next.id)) {
      open(next.id);
    }

    // Routes that exist only for a prototype close with it.
    if (
      courseSlug &&
      routeIds.some((routeId) => PROTOTYPE_ONLY_ROUTES.includes(routeId)) &&
      next?.id !== 'task-deadlines'
    ) {
      void navigate({ to: '/courses/$courseSlug', params: { courseSlug } });
    }
  }

  return (
    <div
      data-prototype-bar
      className={cn(
        'fixed bottom-3 left-3 z-[100]',
        'flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full',
        'bg-zinc-950 p-1 text-sm text-zinc-50 shadow-2xl ring-2 ring-fuchsia-500',
        'dark:bg-zinc-50 dark:text-zinc-950'
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 hover:bg-white/15"
          >
            <FlaskConical className="size-4 text-fuchsia-400 dark:text-fuchsia-600" />
            <span className="max-w-[40vw] truncate font-semibold">
              {current ? `#${current.issue} · ${current.title}` : 'Прототипы'}
            </span>
            <ChevronUp className="size-3.5 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={10}
          className="z-[110] w-72"
        >
          <DropdownMenuLabel>Прототип на всех страницах</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={active ?? OFF} onValueChange={choose}>
            <DropdownMenuRadioItem value={OFF}>
              Выключен — как в main
            </DropdownMenuRadioItem>
            {PROTOTYPES.map((prototype) => (
              <DropdownMenuRadioItem key={prototype.id} value={prototype.id}>
                #{prototype.issue} · {prototype.title}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {current && !onScreen(current.id) ? (
        <button
          type="button"
          onClick={() => open(current.id)}
          className="h-8 shrink-0 rounded-full px-2.5 text-xs underline hover:bg-white/15"
        >
          {OPEN_LABEL[current.id]}
        </button>
      ) : null}

      {active === 'task-deadlines' ? (
        <span className="flex min-w-0 items-center gap-1 border-l border-white/20 pl-1">
          <SandboxControls courseSlug={SANDBOX_COURSE_SLUG} />
        </span>
      ) : null}

      {/* A mounted prototype screen renders its own controls here. */}
      <span
        ref={setSlot}
        className="flex min-w-0 items-center gap-1 border-l border-white/20 pl-1 empty:hidden"
      />
    </div>
  );
}
