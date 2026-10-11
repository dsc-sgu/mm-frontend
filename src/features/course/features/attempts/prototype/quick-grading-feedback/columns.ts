// PROTOTYPE (#121): desktop zones of the compact row from #45/#100:
// Student | Task (+ attempt, diff) | Submission | State | Grade [| Feedback]
// Diff has no zone of its own. B gives Student and Task the largest share of
// the free width so full "Фамилия Имя Отчество" fits. No row action: quick
// grading has no "Ревью" button (it cost B ~110px at every breakpoint).
export type FeedbackColumn = 'button' | 'field';

export const desktopColumns: Record<FeedbackColumn, string> = {
  button: 'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_11rem_8.5rem_9.75rem]',
  field:
    'grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_11rem_8.5rem_7.25rem_minmax(10rem,1fr)]',
};
