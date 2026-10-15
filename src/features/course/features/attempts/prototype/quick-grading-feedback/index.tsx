// PROTOTYPE (#121): where does optional Overall Feedback live in compact quick
// grading? Chosen: B, an inline field in the row (A popover, C inspector and
// D pre-publish step were rejected; see git history of this branch). Rows
// share one fixed height per layout tier. The page-wide top bar shows the
// locked filters; the list gets the full page width. Save is simulated in
// memory (see session.ts).
import { gradeToNumber } from '@/features/course/model/grade';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Keyboard, Save } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { PrototypeBarControls } from '@/app/prototypes/bar-controls';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import type {
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';
import { InlineFeedbackCell } from './feedback';
import { FixedRowsList, ListHeader } from './list';
import { useFixedRowsVirtualizer } from './use-fixed-rows';
import { withRealisticNames, withRealisticStudentNames } from './names';
import { RecoveryDialog } from './recovery';
import { ExitDialog } from './exit-dialog';
import { getModKeyLabel, isExitShortcut, isSaveShortcut } from './shortcuts';
import { QuickGradingTopBar, StickyTop } from './top-bar';
import { QuickRow, type RowLayout } from './row';
import {
  INITIAL_QUICK_SESSION,
  canGrade,
  entryError,
  quickSessionReducer,
  simulateSave,
  type QuickEntry,
} from './session';

// One fixed height per layout tier, so the virtualizer never measures rows.
const ROW_HEIGHT: Record<RowLayout, number> = {
  wide: 64,
  medium: 88,
  stacked: 124,
};
// Tier breakpoints, picked by measurement with realistic ФИО: the narrowest
// width at which Student and Task still fit (one line for wide, two clamped
// lines for medium). The inline feedback zone costs width.
const QUICK_TIER_FROM = {
  wide: '(min-width: 1400px)',
  medium: '(min-width: 1120px)',
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

export function QuickGradingFeedbackPrototype({
  attempts: loadedAttempts,
  filters,
  tasks,
  students,
  onExit,
}: {
  attempts: readonly CourseAttempt[];
  filters: CourseAttemptsFilters;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  onExit: () => void;
}) {
  'use no memo';

  const wideTier = useMediaQuery(QUICK_TIER_FROM.wide);
  const mediumTier = useMediaQuery(QUICK_TIER_FROM.medium);
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
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const modKeyLabel = getModKeyLabel();

  const { virtualizer, setListRef, scrollMargin } = useFixedRowsVirtualizer({
    count: attempts.length,
    rowHeight,
    getKey: (index) => attempts[index]?.id ?? index,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

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
    entryError(
      session.entries.get(attempt.id),
      gradeToNumber(attempt.task.maxGrade)
    )
  );
  const publishable = gradeableDirty.filter(
    (attempt) =>
      !session.saving.has(attempt.id) &&
      !entryError(
        session.entries.get(attempt.id),
        gradeToNumber(attempt.task.maxGrade)
      ) &&
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
    if (gradeableDirty.length > 0 || session.recovery.length > 0) {
      setExitOpen(true);
      return;
    }

    onExit();
  };

  // Mod+S saves (and never opens the browser's "Save page"); with invalid
  // values it jumps to the first error instead. Esc leaves the session unless
  // a popover, drawer or dialog consumed it first. Re-subscribes every render
  // to see the latest session; fine for a prototype.
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isSaveShortcut(event)) {
        event.preventDefault();

        if (canSave) {
          startSave();
        } else if (invalid[0]) {
          focusField(invalid[0].id, 'grade');
        }

        return;
      }

      if (
        isExitShortcut(event) &&
        !recoveryOpen &&
        !exitOpen &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        exit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

    return (
      <InlineFeedbackCell
        {...common}
        inputRef={registerField(`${attempt.id}:feedback`)}
        onFocus={() => activate(attempt.id)}
      />
    );
  };

  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8',
        fullWidth ? null : 'max-w-7xl'
      )}
    >
      <div className="mt-1 min-w-0 sm:mt-3">
        <StickyTop>
          <QuickGradingTopBar
            count={attempts.length}
            filters={filters}
            tasks={tasks}
            students={
              realisticNames ? withRealisticStudentNames(students) : students
            }
            actions={
              <>
                <span className="px-1 text-xs text-muted-foreground">
                  Не сохранено: {gradeableDirty.length}
                  {invalid.length > 0 ? (
                    <span className="text-destructive">
                      {' '}
                      · ошибок: {invalid.length}
                    </span>
                  ) : null}
                  {savedCount > 0 ? ` · опубликовано: ${savedCount}` : null}
                </span>
                {invalid[0] ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive"
                    onClick={() => focusField(invalid[0]!.id, 'grade')}
                  >
                    К ошибке
                  </Button>
                ) : null}
                {session.recovery.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-destructive/50 text-destructive"
                    onClick={() => setRecoveryOpen(true)}
                  >
                    Не опубликовано: {session.recovery.length}
                  </Button>
                ) : null}
                {desktop ? <KeyHintsButton modKeyLabel={modKeyLabel} /> : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={exit}
                >
                  Выйти
                  {desktop ? <Kbd>Esc</Kbd> : null}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  disabled={!canSave}
                  onClick={startSave}
                >
                  <Save className="size-3.5" />
                  Сохранить
                  {desktop ? (
                    <KbdGroup>
                      <Kbd>{modKeyLabel}</Kbd>
                      <Kbd>S</Kbd>
                    </KbdGroup>
                  ) : null}
                </Button>
              </>
            }
          />
          {desktop ? <ListHeader feedbackColumn="field" /> : null}
        </StickyTop>

        <section className="min-w-0 pb-24">
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
                  feedbackColumn="field"
                  attempt={attempt}
                  entry={entry}
                  outcome={session.outcomes.get(attempt.id)}
                  error={
                    gradeable
                      ? entryError(entry, gradeToNumber(attempt.task.maxGrade))
                      : null
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

      <ExitDialog
        open={exitOpen}
        unsavedCount={gradeableDirty.length}
        recoveryCount={session.recovery.length}
        modKeyLabel={modKeyLabel}
        onOpenChange={setExitOpen}
        onExit={() => {
          setExitOpen(false);
          onExit();
        }}
      />

      <RecoveryDialog
        open={recoveryOpen}
        entries={session.recovery}
        savedCount={savedCount}
        onOpenChange={setRecoveryOpen}
        onDismiss={(attemptId) =>
          dispatch({ type: 'dismissRecovery', attemptId })
        }
      />

      <PrototypeBarControls>
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
        <button
          type="button"
          className="rounded-full px-2 py-1 text-xs underline"
          onClick={() => setShowState((value) => !value)}
        >
          state
        </button>
      </PrototypeBarControls>

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
              layout,
              fit,
              exitOpen,
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

// The session shortcuts no longer fit the bar next to the actions, so they
// live behind one button.
function KeyHintsButton({ modKeyLabel }: { modKeyLabel: string }) {
  const hints: Array<{ keys: string[]; action: string }> = [
    { keys: ['Enter', '↓'], action: 'следующий балл' },
    { keys: ['Shift+Enter', '↑'], action: 'предыдущий балл' },
    { keys: ['Tab'], action: 'балл → отзыв → следующий балл' },
    { keys: ['Enter'], action: 'в отзыве — следующий балл' },
    { keys: [modKeyLabel, 'S'], action: 'сохранить' },
    { keys: ['Esc'], action: 'выйти' },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Клавиши"
          title="Клавиши"
        >
          <Keyboard className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-semibold">Клавиши</p>
        <ul className="grid gap-1.5 text-xs text-muted-foreground">
          {hints.map((hint) => (
            <li key={hint.action} className="flex items-center gap-1.5">
              <KbdGroup>
                {hint.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
              {hint.action}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
