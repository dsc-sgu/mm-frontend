// PROTOTYPE (#121): where does optional Overall Feedback live in compact quick
// grading? Two variants on the real Course Attempts route, switched with
// `?variant=A|B` (C and D were rejected). Rows share one fixed height per
// breakpoint; only the feedback affordance differs. The filter sidebar is
// replaced by a top bar so the list gets the full page width. Save is
// simulated in memory (see session.ts).
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Save } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd } from '@/shadcn/components/ui/kbd';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { PrototypeSwitcher } from '@/app/prototype-switcher';
import { BottomActionBar } from '@/features/course/features/attempts/ui/bottom-bar';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import type {
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';
import { InlineFeedbackCell, PopoverFeedbackCell } from './feedback';
import { FixedRowsList } from './list';
import { useFixedRowsVirtualizer } from './use-fixed-rows';
import { withRealisticNames } from './names';
import { RecoveryDialog } from './recovery';
import { QuickGradingTopBar } from './top-bar';
import { columnsKey, desktopColumns, type FeedbackColumn } from './columns';
import { QuickRow, type RowLayout } from './row';
import {
  INITIAL_QUICK_SESSION,
  canGrade,
  entryError,
  quickSessionReducer,
  simulateSave,
  type QuickEntry,
} from './session';

const VARIANTS = [
  { key: 'A', name: 'Popover из кнопки' },
  { key: 'B', name: 'Поле в строке' },
] as const;

type VariantKey = (typeof VARIANTS)[number]['key'];

const feedbackColumnByVariant: Record<VariantKey, FeedbackColumn> = {
  A: 'button',
  B: 'field',
};

// One fixed height per layout tier, so the virtualizer never measures rows.
const ROW_HEIGHT: Record<RowLayout, number> = {
  wide: 64,
  medium: 88,
  stacked: 124,
};
// Tier breakpoints per variant, picked by measurement with realistic ФИО:
// the narrowest width at which Student and Task still fit (one line for wide,
// two clamped lines for medium). B pays for its feedback zone with width.
const TIER_FROM: Record<VariantKey, { wide: string; medium: string }> = {
  A: { wide: '(min-width: 1200px)', medium: '(min-width: 920px)' },
  B: { wide: '(min-width: 1400px)', medium: '(min-width: 1120px)' },
};

type FitKind = 'name' | 'task' | 'submission' | 'state';
type FitReport = Record<FitKind, number> & { rows: number };
const EMPTY_FIT: FitReport = {
  rows: 0,
  name: 0,
  task: 0,
  submission: 0,
  state: 0,
};

function toVariantKey(value: string | undefined): VariantKey {
  return VARIANTS.find((variant) => variant.key === value)?.key ?? 'A';
}

export function QuickGradingFeedbackPrototype({
  attempts: loadedAttempts,
  filters,
  tasks,
  students,
  variant: rawVariant,
  onVariantChange,
  onExit,
}: {
  attempts: readonly CourseAttempt[];
  filters: CourseAttemptsFilters;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  variant: string | undefined;
  onVariantChange: (variant: string) => void;
  onExit: () => void;
}) {
  'use no memo';

  const variant = toVariantKey(rawVariant);
  const wideTier = useMediaQuery(TIER_FROM[variant].wide);
  const mediumTier = useMediaQuery(TIER_FROM[variant].medium);
  const layout: RowLayout = wideTier
    ? 'wide'
    : mediumTier
      ? 'medium'
      : 'stacked';
  const desktop = layout !== 'stacked';
  const rowHeight = ROW_HEIGHT[layout];

  const [realisticNames, setRealisticNames] = useState(true);
  // The Course Attempts page caps content at max-w-7xl (1280px); "широко"
  // lets quick grading use the full viewport to see whether that saves B.
  const [fullWidth, setFullWidth] = useState(true);
  const attempts = useMemo(
    () =>
      realisticNames ? withRealisticNames(loadedAttempts) : loadedAttempts,
    [loadedAttempts, realisticNames]
  );

  const [session, dispatch] = useReducer(
    quickSessionReducer,
    INITIAL_QUICK_SESSION
  );
  const [simulateConflict, setSimulateConflict] = useState(true);
  const [showState, setShowState] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const { virtualizer, setListRef, scrollMargin } = useFixedRowsVirtualizer({
    count: attempts.length,
    rowHeight,
    getKey: (index) => attempts[index]?.id ?? index,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

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

  // Surface whether texts fit: count rendered `[data-fit]` texts cut off by
  // their zone, horizontally (ellipsis) or vertically (line clamp). Polling is
  // fine for a throwaway prototype.
  const [fit, setFit] = useState<FitReport>(EMPTY_FIT);
  useEffect(() => {
    const measure = () => {
      const next: FitReport = {
        ...EMPTY_FIT,
        rows: document.querySelectorAll('article').length,
      };

      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-fit]'
      )) {
        const kind = element.dataset.fit as FitKind;
        const cut =
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1;

        if (cut && kind in next) {
          next[kind] += 1;
        }
      }

      setFit((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next
      );
    };
    measure();
    const interval = window.setInterval(measure, 400);

    return () => window.clearInterval(interval);
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

  const focusField = (attemptId: string, field: 'grade' | 'feedback') => {
    const key = `${attemptId}:${field}`;
    const tryFocus = () => {
      const element = fields.current.get(key);

      if (!element) {
        return false;
      }

      element.focus();
      element.scrollIntoView({ block: 'nearest' });

      if (element instanceof HTMLInputElement) {
        element.select();
      }

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
        focusField(attempt.id, 'grade');
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

  const renderFeedbackCell = (attempt: CourseAttempt) => {
    const entry = session.entries.get(attempt.id);
    const outcome = session.outcomes.get(attempt.id);
    const editable =
      canGrade(attempt, session) && !session.saving.has(attempt.id);
    const feedback = editable
      ? (entry?.feedback ?? '')
      : outcome?.status === 'saved'
        ? outcome.feedback
        : (entry?.feedback ?? '');
    const common = {
      layout,
      attempt,
      feedback,
      editable,
      onFeedbackChange: (value: string) => edit(attempt.id, 'feedback', value),
      onCommitNext: () => moveGrade(attempt.id, 1),
    } as const;

    switch (variant) {
      case 'A':
        return <PopoverFeedbackCell {...common} />;
      case 'B':
        return (
          <InlineFeedbackCell
            {...common}
            inputRef={registerField(`${attempt.id}:feedback`)}
            onFocus={() => activate(attempt.id)}
          />
        );
    }
  };

  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8',
        fullWidth ? null : 'max-w-7xl'
      )}
    >
      <div className="mt-4 min-w-0 sm:mt-6">
        <QuickGradingTopBar
          count={attempts.length}
          filters={filters}
          tasks={tasks}
          students={students}
          hints={variantHints[variant].map((hint) => (
            <span key={hint.action} className="flex items-center gap-1">
              {hint.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
              {hint.action}
            </span>
          ))}
        />

        <section className="min-w-0 pb-44 sm:pb-36">
          {desktop ? (
            <ListHeader
              feedbackColumn={feedbackColumnByVariant[variant]}
              showAction={showAction}
            />
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
                  feedbackColumn={feedbackColumnByVariant[variant]}
                  showAction={showAction}
                  attempt={attempt}
                  entry={entry}
                  outcome={session.outcomes.get(attempt.id)}
                  error={
                    gradeable ? entryError(entry, attempt.task.maxScore) : null
                  }
                  saving={session.saving.has(attempt.id)}
                  gradeable={gradeable}
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
      </div>

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
                onClick={() => focusField(invalid[0]!.id, 'grade')}
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
              <Save className="size-4" />
              Сохранить
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
        <label className="flex cursor-pointer items-center gap-1 px-1 text-xs">
          <input
            type="checkbox"
            checked={simulateConflict}
            onChange={(event) => setSimulateConflict(event.target.checked)}
          />
          конфликт
        </label>
        <label
          className="flex cursor-pointer items-center gap-1 px-1 text-xs"
          title="Реалистичные «Фамилия Имя Отчество» вместо коротких моковых имён"
        >
          <input
            type="checkbox"
            checked={realisticNames}
            onChange={(event) => setRealisticNames(event.target.checked)}
          />
          ФИО
        </label>
        {desktop ? (
          <label
            className="flex cursor-pointer items-center gap-1 px-1 text-xs"
            title="Снять ограничение max-w-7xl (1280px) у страницы"
          >
            <input
              type="checkbox"
              checked={fullWidth}
              onChange={(event) => setFullWidth(event.target.checked)}
            />
            широко
          </label>
        ) : null}
        {desktop ? (
          <span
            className="px-1 text-xs tabular-nums"
            title={`Обрезано в ${fit.rows} отрисованных строках: ФИО ${fit.name}, задания ${fit.task}, отправлено ${fit.submission}, состояние ${fit.state}`}
          >
            обрезано {fit.name + fit.task + fit.submission + fit.state}
          </span>
        ) : null}
        <label className="flex cursor-pointer items-center gap-1 px-1 text-xs">
          <input
            type="checkbox"
            checked={showAction}
            onChange={(event) => setShowAction(event.target.checked)}
          />
          действие
        </label>
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
              fit,
              fullWidth,
              activeAttemptId: session.activeAttemptId,
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

const variantHints: Record<
  VariantKey,
  Array<{ keys: string[]; action: string }>
> = {
  A: [
    { keys: ['Enter', '↓'], action: 'следующий балл' },
    { keys: ['Tab'], action: 'кнопка отзыва' },
    { keys: ['Enter'], action: 'в отзыве — дальше' },
  ],
  B: [
    { keys: ['Enter', '↓'], action: 'следующий балл' },
    { keys: ['Tab'], action: 'балл → отзыв → балл' },
    { keys: ['Enter'], action: 'в отзыве — дальше' },
  ],
};
