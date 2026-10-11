// PROTOTYPE (#121): desktop zones of the compact row from #45/#100:
// Student | Task (+ attempt, diff) | Submission | State | Grade [| Feedback].
// Diff has no zone of its own. Quick grading (variant B) adds the inline
// Overall Feedback field and gives Student and Task the largest share of the
// free width so full "Фамилия Имя Отчество" fits; normal mode has no
// feedback zone. No row action: the whole row opens the Attempt (#117) and
// quick grading has no "Ревью" button (it cost ~110px at every breakpoint).
export type FeedbackColumn = 'field' | 'none';

export const desktopColumns: Record<FeedbackColumn, string> = {
  field:
    'grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_11rem_8.5rem_7.25rem_minmax(10rem,1fr)]',
  none: 'grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_11rem_8.5rem_7.25rem]',
};
