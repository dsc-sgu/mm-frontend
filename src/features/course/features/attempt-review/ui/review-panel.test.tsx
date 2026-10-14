import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as v from 'valibot';
import { beforeEach, expect, test } from 'vitest';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { GradeSchema } from '@/features/course/model/grade';
import {
  fetchAttemptReview,
  saveAttemptReview,
} from '@/features/course/features/attempt-review/api/mock';
import { useAttemptReviewDraft } from '@/features/course/features/attempt-review/model/draft';
import type {
  AttemptReviewAggregate,
  AttemptReviewIdentity,
  SaveAttemptReviewInput,
} from '@/features/course/features/attempt-review/model/types';
import { AttemptReviewReviewPanel } from './review-panel';

const [sashaFirst, , petyaFirst] = reviewWorld.attempts;

function identity(
  attempt: (typeof reviewWorld.attempts)[number]
): AttemptReviewIdentity {
  return {
    courseId: attempt.courseId,
    studentId: attempt.studentId,
    attemptId: attempt.id,
  };
}

async function existingReview(): Promise<AttemptReviewAggregate> {
  return saveAttemptReview({
    ...identity(sashaFirst),
    grade: v.parse(GradeSchema, 7.5),
    overallFeedbackHtml: '<p>Хорошо</p>',
    lineComments: [],
  });
}

function ReviewPanel({ review }: { review: AttemptReviewAggregate }) {
  const { draft, gradeError, hasChanges, savableGrade, setGrade } =
    useAttemptReviewDraft(review);

  return (
    <AttemptReviewReviewPanel
      review={review}
      draft={draft}
      mode="editable"
      gradeError={gradeError}
      hasChanges={hasChanges}
      canSave={savableGrade !== null}
      savePending={false}
      onGradeChange={setGrade}
      onFeedbackChange={() => {}}
      onDiscard={() => {}}
      onSave={async () => {}}
    />
  );
}

beforeEach(() => {
  // jsdom has no layout; the feedback editor's placeholder probes the viewport.
  document.elementFromPoint = () => null;
  mockBackend.reset('world:review');
  mockBackend.state.session = {
    userId: accessWorld.users.anna.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

test('REV-03: an empty Grade invalidates the edits of a first Review', async () => {
  const review = await fetchAttemptReview(identity(petyaFirst));
  expect(review.current.grade).toBeNull();
  const { result } = renderHook(() => useAttemptReviewDraft(review));
  expect(result.current.gradeError).toBeNull();

  act(() => result.current.setOverallFeedbackHtml('<p>Отзыв</p>'));

  expect(result.current.hasChanges).toBe(true);
  expect(result.current.savableGrade).toBeNull();
  expect(result.current.gradeError).toBe('empty');
});

test('REV-03, A11Y-02: an existing Grade cannot be erased', async () => {
  const user = userEvent.setup();
  render(<ReviewPanel review={await existingReview()} />);
  const field = screen.getByRole('textbox', { name: 'Оценка за попытку' });
  expect(field).toHaveProperty('value', '7,5');
  expect(field.getAttribute('aria-invalid')).toBe('false');

  await user.clear(field);

  expect(field.getAttribute('aria-invalid')).toBe('true');
  expect(field.getAttribute('aria-describedby')).toBeTruthy();
  expect(
    document.getElementById(field.getAttribute('aria-describedby') ?? '')
      ?.textContent
  ).toBe('Введите оценку');
  expect(screen.getByRole('button', { name: /Сохранить/ })).toHaveProperty(
    'disabled',
    true
  );
});

test('REV-03, A11Y-02: extra fraction digits are shown at the field', async () => {
  const user = userEvent.setup();
  render(<ReviewPanel review={await existingReview()} />);
  const field = screen.getByRole('textbox', { name: 'Оценка за попытку' });
  const save = screen.getByRole('button', { name: /Сохранить/ });

  await user.clear(field);
  await user.type(field, '7,1255');

  expect(field.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText('Не больше трёх знаков после запятой').id).toBe(
    field.getAttribute('aria-describedby')
  );
  expect(save).toHaveProperty('disabled', true);

  await user.type(field, '{Backspace}');

  expect(field.getAttribute('aria-invalid')).toBe('false');
  expect(field.getAttribute('aria-describedby')).toBeNull();
  expect(save).toHaveProperty('disabled', false);
});

test('REV-03: Save has no command to clear a Grade', () => {
  const input: Omit<SaveAttemptReviewInput, keyof AttemptReviewIdentity> = {
    // @ts-expect-error Save always carries a Grade.
    grade: null,
    overallFeedbackHtml: '',
    lineComments: [],
  };
  expect(input.grade).toBeNull();
});
