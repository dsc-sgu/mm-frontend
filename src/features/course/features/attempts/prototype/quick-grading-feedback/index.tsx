// PROTOTYPE (#121): where does optional Overall Feedback live in compact quick
// grading? Four variants on the real Course Attempts route, switched with
// `?variant=A|B|C|D`. Rows share one fixed height per breakpoint; only the
// feedback affordance differs. Save is simulated in memory (see session.ts).
import { useEffect, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Filter, Save } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd } from '@/shadcn/components/ui/kbd';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { PrototypeSwitcher } from '@/app/prototype-switcher';
import { BottomActionBar } from '@/features/course/features/attempts/ui/bottom-bar';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import {
  FeedbackIndicator,
  FeedbackPreview,
  InlineFeedbackCell,
  KeyHints,
  PopoverFeedbackCell,
} from './feedback';
import { FeedbackInspector } from './inspector';
import { FixedRowsList } from './list';
import { useFixedRowsVirtualizer } from './use-fixed-rows';
import { PresaveSheet } from './presave';
import { RecoveryDialog } from './recovery';
import { columnsKey, desktopColumns, type FeedbackColumn } from './columns';
import { QuickRow } from './row';
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
  { key: 'C', name: 'Inspector' },
  { key: 'D', name: 'Шаг перед публикацией' },
] as const;

type VariantKey = (typeof VARIANTS)[number]['key'];

const feedbackColumnByVariant: Record<VariantKey, FeedbackColumn> = {
  A: 'button',
  B: 'field',
  C: 'icon',
  D: 'icon',
};

const ROW_HEIGHT = { desktop: 64, mobile: 120 } as const;

function toVariantKey(value: string | undefined): VariantKey {
  return VARIANTS.find((variant) => variant.key === value)?.key ?? 'A';
}

export function QuickGradingFeedbackPrototype({
  attempts,
  variant: rawVariant,
  onVariantChange,
  onExit,
}: {
  attempts: readonly CourseAttempt[];
  variant: string | undefined;
  onVariantChange: (variant: string) => void;
  onExit: () => void;
}) {
  'use no memo';

  const variant = toVariantKey(rawVariant);
  const desktop = useMediaQuery('(min-width: 768px)');
  const wide = useMediaQuery('(min-width: 1024px)');
  const layout = desktop ? 'desktop' : 'mobile';
  const rowHeight = ROW_HEIGHT[layout];
  const inspectorInBar = variant === 'C' && !wide;

  const [session, dispatch] = useReducer(
    quickSessionReducer,
    INITIAL_QUICK_SESSION
  );
  const [simulateConflict, setSimulateConflict] = useState(true);
  const [showState, setShowState] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [presaveOpen, setPresaveOpen] = useState(false);

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
    html.style.scrollPaddingBottom = inspectorInBar ? '15rem' : '9rem';

    return () => {
      html.style.scrollPaddingTop = previous[0] ?? '';
      html.style.scrollPaddingBottom = previous[1] ?? '';
    };
  }, [inspectorInBar]);

  // ── focus navigation ──────────────────────────────────────────────────────

  const fields = useRef(new Map<string, HTMLElement>());
  const registerField = (key: string) => (element: HTMLElement | null) => {
    if (element) {
      fields.current.set(key, element);
    } else {
      fields.current.delete(key);
    }
  };

  const focusField = (
    attemptId: string,
    field: 'grade' | 'feedback' | 'inspector'
  ) => {
    const key = field === 'inspector' ? 'inspector' : `${attemptId}:${field}`;
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
        return;
      }

      if (variant === 'C' && event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        focusField(attempt.id, 'inspector');
      }
    };

  const handleInspectorKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const attemptId = session.activeAttemptId;

    if (!attemptId) {
      return;
    }

    if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault();
      moveGrade(attemptId, event.shiftKey ? -1 : 1);
      return;
    }

    if ((event.key === 'Tab' && event.shiftKey) || event.key === 'Escape') {
      event.preventDefault();
      focusField(attemptId, 'grade');
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

  const activeAttempt =
    attempts.find((attempt) => attempt.id === session.activeAttemptId) ?? null;
  const activeEditable = activeAttempt
    ? canGrade(activeAttempt, session) && !session.saving.has(activeAttempt.id)
    : false;
  const activeOutcome = activeAttempt
    ? session.outcomes.get(activeAttempt.id)
    : undefined;
  const inspector = (placement: 'sidebar' | 'bar') => (
    <FeedbackInspector
      placement={placement}
      attempt={activeAttempt}
      grade={
        activeAttempt
          ? (session.entries.get(activeAttempt.id)?.grade ?? '')
          : ''
      }
      feedback={
        activeEditable && activeAttempt
          ? (session.entries.get(activeAttempt.id)?.feedback ?? '')
          : activeOutcome?.status === 'saved'
            ? activeOutcome.feedback
            : ''
      }
      editable={activeEditable}
      fieldRef={registerField('inspector')}
      onFeedbackChange={(value) => {
        if (activeAttempt) {
          edit(activeAttempt.id, 'feedback', value);
        }
      }}
      onFieldKeyDown={handleInspectorKeyDown}
    />
  );

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
      case 'C': {
        const openInspector = editable
          ? () => {
              activate(attempt.id);
              focusField(attempt.id, 'inspector');
            }
          : undefined;

        return layout === 'desktop' ? (
          <FeedbackIndicator feedback={feedback} onClick={openInspector} />
        ) : (
          <FeedbackPreview
            feedback={feedback}
            emptyLabel={editable ? 'отзыв' : undefined}
            onClick={openInspector}
          />
        );
      }
      case 'D':
        return layout === 'desktop' ? (
          <FeedbackIndicator feedback={feedback} />
        ) : (
          <FeedbackPreview feedback={feedback} />
        );
    }
  };

  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-5',
        'lg:px-8'
      )}
    >
      <div
        className={cn(
          'mt-4 grid min-w-0 gap-4 sm:mt-6 sm:gap-6',
          'lg:grid-cols-[20rem_minmax(0,1fr)]'
        )}
      >
        {wide ? (
          variant === 'C' ? (
            inspector('sidebar')
          ) : (
            <LockedFiltersCard variant={variant} count={attempts.length} />
          )
        ) : null}

        <section
          className={cn('min-w-0', inspectorInBar ? 'pb-72' : 'pb-44 sm:pb-36')}
        >
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
                  active={
                    variant === 'C' && session.activeAttemptId === attempt.id
                  }
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
        {inspectorInBar ? inspector('bar') : null}
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
              onClick={variant === 'D' ? () => setPresaveOpen(true) : startSave}
            >
              <Save className="size-4" />
              {variant === 'D' ? 'Проверить и опубликовать…' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </BottomActionBar>

      <PresaveSheet
        open={presaveOpen}
        layout={layout}
        items={publishable.map((attempt) => ({
          attempt,
          entry: session.entries.get(attempt.id)!,
        }))}
        onOpenChange={setPresaveOpen}
        onFeedbackChange={(attemptId, value) =>
          edit(attemptId, 'feedback', value)
        }
        onPublish={() => {
          setPresaveOpen(false);
          startSave();
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

const variantHints: Record<Exclude<VariantKey, 'C'>, string[]> = {
  A: [
    'Enter / ↓ — следующий балл, Shift+Enter / ↑ — предыдущий.',
    'Tab — к кнопке отзыва, Enter — открыть; в поле отзыва Enter — следующий балл.',
  ],
  B: [
    'Enter / ↓ — следующий балл, Shift+Enter / ↑ — предыдущий.',
    'Tab: балл → отзыв → следующий балл; в отзыве Enter — следующий балл.',
  ],
  D: [
    'Enter / ↓ — следующий балл, Shift+Enter / ↑ — предыдущий.',
    'Отзывы добавляются на шаге «Проверить и опубликовать».',
  ],
};

function LockedFiltersCard({
  variant,
  count,
}: {
  variant: Exclude<VariantKey, 'C'>;
  count: number;
}) {
  return (
    <aside
      className={cn(
        'sticky top-20 self-start rounded-3xl border border-border bg-card',
        'p-5 text-sm'
      )}
    >
      <h2 className="flex items-center gap-2 font-semibold text-muted-foreground">
        <Filter className="size-4" /> Фильтры
      </h2>
      <p className="mt-2 text-muted-foreground">
        Недоступны во время быстрой оценки. Попыток в сессии: {count}.
      </p>
      <KeyHints>
        <Kbd>Клавиши</Kbd>
      </KeyHints>
      <ul className="mt-1 grid gap-1 text-xs text-muted-foreground">
        {variantHints[variant].map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ul>
    </aside>
  );
}
