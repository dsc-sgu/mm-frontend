import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { isResourceDenial } from '@/features/course/features/access/api/resource-denial';
import { loadReview } from '@/features/course/features/review/api/load-review';
import type { ReviewEdits } from '@/features/course/features/review/api/mutations';
import type { ReviewResult } from '@/features/course/features/review/model/types';
import { useAttemptReviewDraft } from '@/features/course/features/attempt-review/model/draft';
import { AttemptReviewReviewPanel } from './review-panel';

const [sashaFirst, , petyaFirst] = reviewWorld.attempts;
const { maxGrade } = reviewWorld.task;

async function review(
  attempt: (typeof reviewWorld.attempts)[number]
): Promise<ReviewResult> {
  const result = await loadReview(attempt.courseId, attempt.id);
  if (isResourceDenial(result)) throw new Error('Expected a readable Review');
  return result;
}

/** Sasha's Attempt #1 has Review revision 2 with Grade 7,5. */
function existingReview(): Promise<ReviewResult> {
  return review(sashaFirst);
}

function ReviewPanel({ review }: { review: ReviewResult }) {
  const {
    draft,
    gradeError,
    gradeChanged,
    hasChanges,
    savableGrade,
    setGrade,
  } = useAttemptReviewDraft(review, maxGrade);

  return (
    <AttemptReviewReviewPanel
      review={review}
      maxGrade={maxGrade}
      draft={draft}
      mode="editable"
      gradeError={gradeError}
      gradeChanged={gradeChanged}
      hasChanges={hasChanges}
      canSave={savableGrade !== null}
      saveBlockedReason={null}
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
  const firstReview = await review(petyaFirst);
  expect(firstReview).toEqual({ status: 'none' });
  const { result } = renderHook(() =>
    useAttemptReviewDraft(firstReview, maxGrade)
  );
  expect(result.current.gradeError).toBeNull();

  act(() => result.current.setOverallFeedbackHtml('<p>Отзыв</p>'));

  expect(result.current.hasChanges).toBe(true);
  expect(result.current.savableGrade).toBeNull();
  expect(result.current.gradeError).toBe('empty');
});

test('the published Review names its Teacher by Full Name, surname first', async () => {
  // world:review Users have only a given name; Boris published revision 2.
  const { boris } = accessWorld.users;
  mockBackend.state.users = mockBackend.state.users.map((user) =>
    user.id === boris.id
      ? { ...user, lastName: 'Кузнецов', patronymic: 'Ильич' }
      : user
  );
  render(<ReviewPanel review={await existingReview()} />);

  expect(screen.getByText(/Оценено .* · Кузнецов Борис Ильич$/)).toBeTruthy();
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

test('the same Grade spelled differently is not a change', async () => {
  const user = userEvent.setup();
  render(<ReviewPanel review={await existingReview()} />);
  const field = screen.getByRole('textbox', { name: 'Оценка за попытку' });

  await user.clear(field);
  await user.type(field, '7.50');

  expect(screen.getByRole('button', { name: /Сохранить/ })).toHaveProperty(
    'disabled',
    true
  );
  expect(screen.queryByText('Есть изменения')).toBeNull();
});

test('REV-03: Save has no command to clear a Grade', () => {
  const input: ReviewEdits = {
    // @ts-expect-error Save always carries a Grade.
    grade: null,
    overallFeedbackHtml: '',
    comments: [],
  };
  expect(input.grade).toBeNull();
});
