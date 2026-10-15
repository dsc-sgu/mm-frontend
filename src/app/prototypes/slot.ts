// PROTOTYPE: the element inside the prototype bar where a mounted prototype
// screen puts its own controls (see `PrototypeBarControls`).
import { create } from 'zustand';

type BarSlotState = {
  element: HTMLElement | null;
  setElement: (element: HTMLElement | null) => void;
};

export const useBarSlot = create<BarSlotState>()((set) => ({
  element: null,
  setElement: (element) => set({ element }),
}));
