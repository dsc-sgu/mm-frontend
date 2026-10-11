// PROTOTYPE (#121): desktop grid columns per feedback affordance.
export type FeedbackColumn = 'button' | 'field' | 'preview';

export const desktopColumns: Record<FeedbackColumn, string> = {
  button: 'grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_7.5rem_2.5rem_8.5rem]',
  field:
    'grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_7.5rem_minmax(0,1.5fr)_8.5rem]',
  preview:
    'grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_7.5rem_minmax(0,0.9fr)_8.5rem]',
};
