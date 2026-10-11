// PROTOTYPE (#121): in-memory quick-grading session. Not the real contract:
// save is simulated locally, nothing reaches the mock backend.
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';

export type QuickEntry = {
  grade: string;
  feedback: string;
};

export type RowOutcome =
  | { status: 'saved'; grade: number; feedback: string }
  | {
      status: 'conflict';
      reason: string;
      author: string;
      publishedGrade: number;
    };

export type RecoveryEntry = {
  attemptId: string;
  studentName: string;
  taskTitle: string;
  attemptNumber: number;
  grade: string;
  maxScore: number;
  feedback: string;
  reason: string;
  author: string;
  publishedGrade: number;
};

export type QuickSession = {
  entries: ReadonlyMap<string, QuickEntry>;
  outcomes: ReadonlyMap<string, RowOutcome>;
  recovery: readonly RecoveryEntry[];
  saving: ReadonlySet<string>;
  activeAttemptId: string | null;
};

export type QuickSessionEvent =
  | {
      type: 'edit';
      attemptId: string;
      field: keyof QuickEntry;
      value: string;
    }
  | { type: 'activate'; attemptId: string }
  | { type: 'saveStarted'; attemptIds: readonly string[] }
  | {
      type: 'saveFinished';
      outcomes: ReadonlyMap<string, RowOutcome>;
      recovery: readonly RecoveryEntry[];
    }
  | { type: 'dismissRecovery'; attemptId: string };

export const INITIAL_QUICK_SESSION: QuickSession = {
  entries: new Map(),
  outcomes: new Map(),
  recovery: [],
  saving: new Set(),
  activeAttemptId: null,
};

export function quickSessionReducer(
  state: QuickSession,
  event: QuickSessionEvent
): QuickSession {
  switch (event.type) {
    case 'edit': {
      if (state.saving.has(event.attemptId)) {
        return state;
      }

      const current = state.entries.get(event.attemptId) ?? {
        grade: '',
        feedback: '',
      };
      const next = {
        ...current,
        [event.field]:
          event.field === 'feedback'
            ? toSingleParagraph(event.value)
            : event.value,
      };
      const entries = new Map(state.entries);

      if (next.grade === '' && next.feedback.trim() === '') {
        entries.delete(event.attemptId);
      } else {
        entries.set(event.attemptId, next);
      }

      return { ...state, entries };
    }

    case 'activate':
      return state.activeAttemptId === event.attemptId
        ? state
        : { ...state, activeAttemptId: event.attemptId };

    case 'saveStarted':
      return { ...state, saving: new Set(event.attemptIds) };

    case 'saveFinished': {
      const entries = new Map(state.entries);
      const outcomes = new Map(state.outcomes);

      event.outcomes.forEach((outcome, attemptId) => {
        entries.delete(attemptId);
        outcomes.set(attemptId, outcome);
      });

      return {
        ...state,
        entries,
        outcomes,
        recovery: [...state.recovery, ...event.recovery],
        saving: new Set(),
      };
    }

    case 'dismissRecovery':
      return {
        ...state,
        recovery: state.recovery.filter(
          (entry) => entry.attemptId !== event.attemptId
        ),
      };
  }
}

// One-line input persists as a single-paragraph ReviewTextDocument (#114).
function toSingleParagraph(value: string): string {
  return value.replace(/\s*[\r\n]+\s*/g, ' ');
}

export function entryError(
  entry: QuickEntry | undefined,
  maxScore: number
): string | null {
  if (!entry) {
    return null;
  }

  if (entry.grade === '' && entry.feedback.trim() !== '') {
    return 'Нужен балл';
  }

  if (entry.grade !== '' && Number(entry.grade) > maxScore) {
    return `Не больше ${maxScore}`;
  }

  return null;
}

export function canGrade(
  attempt: CourseAttempt,
  session: QuickSession
): boolean {
  return (
    !attempt.grade && !attempt.reviewLock && !session.outcomes.has(attempt.id)
  );
}

export function simulateSave({
  attempts,
  session,
  simulateConflict,
}: {
  attempts: readonly CourseAttempt[];
  session: QuickSession;
  simulateConflict: boolean;
}): {
  outcomes: Map<string, RowOutcome>;
  recovery: RecoveryEntry[];
} {
  const outcomes = new Map<string, RowOutcome>();
  const recovery: RecoveryEntry[] = [];
  let conflictUsed = !simulateConflict;

  attempts.forEach((attempt) => {
    const entry = session.entries.get(attempt.id);

    if (!entry || !session.saving.has(attempt.id)) {
      return;
    }

    if (!conflictUsed) {
      conflictUsed = true;
      const publishedGrade = Math.round(attempt.task.maxScore * 0.6);
      const outcome: RowOutcome = {
        status: 'conflict',
        reason: 'Review уже появилась',
        author: 'Павел Ковалев',
        publishedGrade,
      };
      outcomes.set(attempt.id, outcome);
      recovery.push({
        attemptId: attempt.id,
        studentName: attempt.student.fullName,
        taskTitle: attempt.task.title,
        attemptNumber: attempt.attemptNumber,
        grade: entry.grade,
        maxScore: attempt.task.maxScore,
        feedback: entry.feedback,
        reason: outcome.reason,
        author: outcome.author,
        publishedGrade,
      });
      return;
    }

    outcomes.set(attempt.id, {
      status: 'saved',
      grade: Number(entry.grade),
      feedback: entry.feedback.trim(),
    });
  });

  return { outcomes, recovery };
}

export function formatRecoveryEntry(entry: RecoveryEntry): string {
  return [
    `${entry.studentName} — ${entry.taskTitle}, попытка #${entry.attemptNumber}`,
    `Ваш балл: ${entry.grade}/${entry.maxScore}`,
    entry.feedback ? `Ваш отзыв: ${entry.feedback}` : 'Ваш отзыв: —',
    `Причина: ${entry.reason}; опубликовал ${entry.author}, балл ${entry.publishedGrade}/${entry.maxScore}`,
  ].join('\n');
}
