// PROTOTYPE (#121): desktop zones of the compact row from #45/#100:
// Student | Task | Submission | State | Diff | Grade [| Feedback] [| Action].
export type FeedbackColumn = 'button' | 'field' | 'icon';

export type ColumnsKey = FeedbackColumn | `${FeedbackColumn}-action`;

export const desktopColumns: Record<ColumnsKey, string> = {
  button:
    'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_9.5rem_8.5rem_5.25rem_9.75rem]',
  'button-action':
    'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_9.5rem_8.5rem_5.25rem_9.75rem_7rem]',
  field:
    'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_9.5rem_8.5rem_5.25rem_7.25rem_minmax(9rem,1.3fr)]',
  'field-action':
    'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_9.5rem_8.5rem_5.25rem_7.25rem_minmax(9rem,1.3fr)_7rem]',
  icon: 'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_9.5rem_8.5rem_5.25rem_9rem]',
  'icon-action':
    'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_9.5rem_8.5rem_5.25rem_9rem_7rem]',
};

export function columnsKey(
  feedbackColumn: FeedbackColumn,
  showAction: boolean
): ColumnsKey {
  return showAction ? `${feedbackColumn}-action` : feedbackColumn;
}
