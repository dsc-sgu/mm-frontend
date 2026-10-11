// PROTOTYPE (#121): desktop zones of the compact row from #45/#100:
// Student | Task (+ attempt, diff) | Submission | State | Grade [| Feedback]
// [| Action]. Diff no longer has its own zone. B gives Student and Task the
// largest share of the free width so full "Фамилия Имя Отчество" fits.
export type FeedbackColumn = 'button' | 'field';

export type ColumnsKey = FeedbackColumn | `${FeedbackColumn}-action`;

export const desktopColumns: Record<ColumnsKey, string> = {
  button: 'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_11rem_8.5rem_9.75rem]',
  'button-action':
    'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_11rem_8.5rem_9.75rem_7rem]',
  field:
    'grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_11rem_8.5rem_7.25rem_minmax(10rem,1fr)]',
  'field-action':
    'grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_11rem_8.5rem_7.25rem_minmax(10rem,1fr)_7rem]',
};

export function columnsKey(
  feedbackColumn: FeedbackColumn,
  showAction: boolean
): ColumnsKey {
  return showAction ? `${feedbackColumn}-action` : feedbackColumn;
}
