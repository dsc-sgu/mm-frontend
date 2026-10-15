// PROTOTYPE (#181): the «Сразу» variant applies a shift at once and offers
// «Отменить» in a toast (Coda, Proton). The toast outlives the dialog.
import { create } from 'zustand';

import type { DeadlineCommand } from '@/features/course/prototype/task-and-deadline-settings/schedule';

export type ShiftToast = {
  id: number;
  title: string;
  detail: string;
  undo: DeadlineCommand[];
  undoLabel: string;
};

let sequence = 0;

export const useShiftToast = create<{
  toast: ShiftToast | null;
  show: (toast: Omit<ShiftToast, 'id'>) => void;
  dismiss: () => void;
}>()((set) => ({
  toast: null,
  show: (toast) => {
    sequence += 1;
    set({ toast: { ...toast, id: sequence } });
  },
  dismiss: () => set({ toast: null }),
}));
