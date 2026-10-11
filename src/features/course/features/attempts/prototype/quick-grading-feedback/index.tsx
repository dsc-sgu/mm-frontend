// PROTOTYPE (#121): where does optional Overall Feedback live in compact quick
// grading? Variants on the real Course Attempts route, switched with
// `?variant=A|B`: A — popover from a button in the Grade zone, B — inline
// field in its own zone. C (inspector) and D (pre-publish step) were rejected
// and live only in this branch's history. Filters are a top bar by default;
// the switcher toggles back to the sidebar to compare row width. Rows share
// one fixed height per breakpoint. Save is simulated in memory (session.ts).
import { useEffect, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Save } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { PrototypeSwitcher } from '@/app/prototype-switcher';
import { BottomActionBar } from '@/features/course/features/attempts/ui/bottom-bar';
import type {
  CourseAttempt,
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';
import { columnsKey, desktopColumns, type FeedbackColumn } from './columns';
import {
  InlineFeedbackCell,
  PopoverFeedbackCell,
  type PublishedFeedback,
} from './feedback';
import { LockedFiltersSidebar, LockedFiltersTopBar } from './filters';
import { FixedRowsList } from './list';
import { mockPublishedFeedback } from './mock-feedback';
import { RecoveryDialog } from './recovery';
import { QuickRow } from './row';
import {
  INITIAL_QUICK_SESSION,
  canGrade,
  entryError,
  quickSessionReducer,
  simulateSave,
  type QuickEntry,
} from './session';
import { useFixedRowsVirtualizer } from './use-fixed-rows';

const VARIANTS = [
  { key: 'A', name: 'Popover из кнопки' },
  { key: 'B', name: 'Поле в строке' },
] as const;

type VariantKey = (typeof VARIANTS)[number]['key'];

const feedbackColumnByVariant: Record<VariantKey, FeedbackColumn> = {
  A: 'button',
  B: 'field',
};

const hintsByVariant: Record<VariantKey, string[]> = {
  A: [
    'Enter / ↓ — следующий балл, Shift+Enter / ↑ — предыдущий',
    'Tab — к кнопке отзыва, Enter — открыть; в отзыве Enter — следующий балл',
  ],
  B: [
    'Enter / ↓ — следующий балл, Shift+Enter / ↑ — предыдущий',
    'Tab: балл → отзыв → следующий балл; в отзыве Enter — следующий балл',
  ],
};

const ROW_HEIGHT = { desktop: 64, mobile: 120 } as const;

function toVariantKey(value: string | undefined): VariantKey {
  return VARIANTS.find((variant) => variant.key === value)?.key ?? 'A';
}

export function QuickGradingFeedbackPrototype({
  attempts,
  appliedFilters,
  tasks,
  students,
  variant: rawVariant,
  onVariantChange,
  onExit,
}: {
  attempts: readonly CourseAttempt[];
  appliedFilters: CourseAttemptsFilters;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  variant: string | undefined;
  onVariantChange: (variant: string) => void;
  onExit: () => void;
}) {
  'use no memo';

  const variant = toVariantKey(rawVariant);
  const feedbackColumn = feedbackColumnByVariant[variant];
  const desktop = useMediaQuery('(min-width: 768px)');
  const wide = useMediaQuery('(min-width: 1024px)');
  const layout = desktop ? 'desktop' : 'mobile';
  const rowHeight = ROW_HEIGHT[layout];

  const [session, dispatch] = useReducer(
    quickSessionReducer,
    INITIAL_QUICK_SESSION
  );
  const [simulateConflict, setSimulateConflict] = useState(true);
  const [showState, setShowState] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [filtersAside, setFiltersAside] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const sidebar = filtersAside && wide;

  const { virtualizer, setListRef, scrollMargin } = useFixedRowsVirtualizer({
    count: attempts.length,
    rowHeight,
    getKey: (index) => attempts[index]?.id ?? index,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, sidebar, virtualizer]);

  // Keep focused fields clear of the sticky header and the bottom bar.
  useEffect(() => {
    const html = document.documentElement;
    const previous = [
      html.style.scrollPaddingTop,
      html.style.scrollPaddingBottom,
    ];
    html.style.scrollPaddingTop = '5rem';
    html.style.scrollPaddingBottom = '9rem';

    return () => {
      html.style.scrollPaddingTop = previous[0] ?? '';
      html.style.scrollPaddingBottom = previous[1] ?? '';
    };
  }, []);

  // ── focus navigation ──────────────────────────────────────────────────────

  const fields = useRef(new Map<string, HTMLElement>());
  const registerField = (key: string) => (element: HTMLElement | null) => {
    if (element) {
      fields.current.set(key, element);
    } else {
      fields.current.delete(key);
    }
  };

  const focusGrade = (attemptId: string) => {
    const key = `${attemptId}:grade`;
    const tryFocus = () => {
      const element = fields.current.get(key);

      if (!(element instanceof HTMLInputElement)) {
        return false;
      }

      element.focus();
      element.scrollIntoView({ block: 'nearest' });
      element.select();
      return true;
    };

    if (tryFocus()) {
      return;
    }

    const index = attempts.findIndex((attempt) => attempt.id === attemptId);

    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: 'center' });
    }

    let frames = 0;
    const tick = () => {
      if (!tryFocus() && frames < 30) {
        frames += 1;
        window.requestAnimationFrame(tick);
      }
    };
    window.requestAnimationFrame(tick);
  };

  const activate = (attemptId: string) =>
    dispatch({ type: 'activate', attemptId });

  const moveGrade = (fromAttemptId: string, direction: 1 | -1) => {
    let index =
      attempts.findIndex((attempt) => attempt.id === fromAttemptId) + direction;

    while (index >= 0 && index < attempts.length) {
      const attempt = attempts[index];

      if (attempt && canGrade(attempt, session)) {
        activate(attempt.id);
        focusGrade(attempt.id);
        return;
      }

      index += direction;
    }
  };

  const edit = (attemptId: string, field: keyof QuickEntry, value: string) =>
    dispatch({ type: 'edit', attemptId, field, value });

  const handleGradeKeyDown =
    (attempt: CourseAttempt) => (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        moveGrade(attempt.id, event.shiftKey ? -1 : 1);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveGrade(attempt.id, event.key === 'ArrowDown' ? 1 : -1);
      }
    };

  // ── derived session summary ───────────────────────────────────────────────

  const gradeableDirty = attempts.filter(
    (attempt) => session.entries.has(attempt.id) && canGrade(attempt, session)
  );
  const invalid = gradeableDirty.filter((attempt) =>
    entryError(session.entries.get(attempt.id), attempt.task.maxScore)
  );
  const publishable = gradeableDirty.filter(
    (attempt) =>
      !session.saving.has(attempt.id) &&
      !entryError(session.entries.get(attempt.id), attempt.task.maxScore) &&
      session.entries.get(attempt.id)?.grade !== ''
  );
  const savedCount = [...session.outcomes.values()].filter(
    (outcome) => outcome.status === 'saved'
  ).length;
  const saving = session.saving.size > 0;
  const canSave = publishable.length > 0 && invalid.length === 0 && !saving;

  const startSave = () => {
    if (!canSave) {
      return;
    }

    const attemptIds = publishable.map((attempt) => attempt.id);
    const result = simulateSave({
      attempts,
      session: { ...session, saving: new Set(attemptIds) },
      simulateConflict,
    });
    dispatch({ type: 'saveStarted', attemptIds });
    window.setTimeout(() => {
      dispatch({ type: 'saveFinished', ...result });

      if (result.recovery.length > 0) {
        setRecoveryOpen(true);
      }
    }, 900);
  };

  const exit = () => {
    if (
      (gradeableDirty.length > 0 || session.recovery.length > 0) &&
      !window.confirm(
        'Есть несохранённые баллы или неопубликованные записи. Выйти и потерять их?'
      )
    ) {
      return;
    }

    onExit();
  };

  // ── rendering ─────────────────────────────────────────────────────────────

  const publishedFeedback = (
    attempt: CourseAttempt
  ): PublishedFeedback | null => {
    const outcome = session.outcomes.get(attempt.id);

    if (outcome?.status === 'saved') {
      return outcome.feedback
        ? { text: outcome.feedback, author: 'Вы, в этой сессии' }
        : null;
    }

    if (attempt.grade) {
      const text = mockPublishedFeedback(attempt);
      return text ? { text, author: attempt.grade.gradedBy } : null;
    }

    return null;
  };

  const renderFeedbackCell = (attempt: CourseAttempt) => {
    const editable =
      canGrade(attempt, session) && !session.saving.has(attempt.id);
    const common = {
      layout,
      attempt,
      feedback: session.entries.get(attempt.id)?.feedback ?? '',
      editable,
      published: editable ? null : publishedFeedback(attempt),
      onFeedbackChange: (value: string) => edit(attempt.id, 'feedback', value),
      onCommitNext: () => moveGrade(attempt.id, 1),
    } as const;

    return variant === 'A' ? (
      <PopoverFeedbackCell {...common} />
    ) : (
      <InlineFeedbackCell
        {...common}
        inputRef={registerField(`${attempt.id}:feedback`)}
        onFocus={() => activate(attempt.id)}
      />
    );
  };

  const filtersProps = {
    filters: appliedFilters,
    tasks,
    students,
    count: attempts.length,
    hints: hintsByVariant[variant],
  };

  const list = (
    <section className="min-w-0 pb-44 sm:pb-36">
      {desktop ? (
        <ListHeader feedbackColumn={feedbackColumn} showAction={showAction} />
      ) : null}
      <FixedRowsList
        attempts={attempts}
        rowHeight={rowHeight}
        virtualizer={virtualizer}
        setListRef={setListRef}
        scrollMargin={scrollMargin}
        renderRow={(attempt) => {
          const entry = session.entries.get(attempt.id);
          const gradeable = canGrade(attempt, session);

          return (
            <QuickRow
              layout={layout}
              feedbackColumn={feedbackColumn}
              showAction={showAction}
              attempt={attempt}
              entry={entry}
              outcome={session.outcomes.get(attempt.id)}
              error={
                gradeable ? entryError(entry, attempt.task.maxScore) : null
              }
              saving={session.saving.has(attempt.id)}
              gradeable={gradeable}
              active={false}
              gradeInputRef={registerField(`${attempt.id}:grade`)}
              onGradeChange={(value) => edit(attempt.id, 'grade', value)}
              onGradeKeyDown={handleGradeKeyDown(attempt)}
              onActivate={() => activate(attempt.id)}
              feedbackCell={renderFeedbackCell(attempt)}
            />
          );
        }}
      />
    </section>
  );

  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-5',
        'lg:px-8'
      )}
    >
      {sidebar ? (
        <div
          className={cn(
            'mt-4 grid min-w-0 gap-6 sm:mt-6',
            'grid-cols-[20rem_minmax(0,1fr)]'
          )}
        >
          <LockedFiltersSidebar {...filtersProps} />
          {list}
        </div>
      ) : (
        <div className="mt-4 min-w-0 sm:mt-6">
          {filtersAside ? null : (
            <LockedFiltersTopBar {...filtersProps} compact={!desktop} />
          )}
          {list}
        </div>
      )}

      <BottomActionBar>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 text-sm leading-tight">
            <p className="font-semibold">Быстрая оценка</p>
            <p className="text-xs text-muted-foreground">
              Не сохранено: {gradeableDirty.length}
              {invalid.length > 0 ? (
                <span className="text-destructive">
                  {' '}
                  · ошибок: {invalid.length}
                </span>
              ) : null}
              {savedCount > 0 ? ` · опубликовано: ${savedCount}` : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {invalid[0] ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-destructive"
                onClick={() => focusGrade(invalid[0]!.id)}
              >
                К ошибке
              </Button>
            ) : null}
            {session.recovery.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 border-destructive/50 text-destructive"
                onClick={() => setRecoveryOpen(true)}
              >
                Не опубликовано: {session.recovery.length}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={exit}
            >
              Выйти
            </Button>
            <Button
              type="button"
              className="h-10"
              disabled={!canSave}
              onClick={startSave}
            >
              <Save className="size-4" /> Сохранить
            </Button>
          </div>
        </div>
      </BottomActionBar>

      <RecoveryDialog
        open={recoveryOpen}
        entries={session.recovery}
        savedCount={savedCount}
        onOpenChange={setRecoveryOpen}
        onDismiss={(attemptId) =>
          dispatch({ type: 'dismissRecovery', attemptId })
        }
      />

      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={onVariantChange}
      >
        <SwitcherToggle checked={filtersAside} onChange={setFiltersAside}>
          фильтры сбоку
        </SwitcherToggle>
        <SwitcherToggle checked={showAction} onChange={setShowAction}>
          действие
        </SwitcherToggle>
        <SwitcherToggle
          checked={simulateConflict}
          onChange={setSimulateConflict}
        >
          конфликт
        </SwitcherToggle>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-xs underline"
          onClick={() => setShowState((value) => !value)}
        >
          state
        </button>
      </PrototypeSwitcher>

      {showState ? (
        <pre
          className={cn(
            'fixed top-14 right-2 z-[100] max-h-[70vh] w-[22rem] overflow-auto',
            'rounded-xl bg-zinc-950 p-3 text-[11px] leading-snug text-zinc-50',
            'shadow-2xl'
          )}
        >
          {JSON.stringify(
            {
              variant,
              layout,
              filters: sidebar ? 'sidebar' : 'top',
              entries: Object.fromEntries(session.entries),
              saving: [...session.saving],
              outcomes: Object.fromEntries(session.outcomes),
              recovery: session.recovery,
            },
            null,
            2
          )}
        </pre>
      ) : null}
    </main>
  );
}

function SwitcherToggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1 px-1 text-xs whitespace-nowrap">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  );
}

function ListHeader({
  feedbackColumn,
  showAction,
}: {
  feedbackColumn: FeedbackColumn;
  showAction: boolean;
}) {
  const zones = [
    'Задание',
    'Отправлено',
    'Состояние',
    'Diff',
    'Балл',
    ...(feedbackColumn === 'field' ? ['Общий отзыв'] : []),
    ...(showAction ? ['Действие'] : []),
  ];

  return (
    <div
      className={cn(
        'mb-1.5 grid px-4 text-xs font-medium text-muted-foreground',
        desktopColumns[columnsKey(feedbackColumn, showAction)]
      )}
    >
      <span>Студент</span>
      {zones.map((zone) => (
        <span key={zone} className="truncate px-3">
          {zone}
        </span>
      ))}
    </div>
  );
}
