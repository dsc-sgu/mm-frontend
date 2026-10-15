// PROTOTYPE: which prototype is switched on. Remembered per browser so a
// reload or any link keeps it; production builds never switch one on.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PrototypeId } from './registry';

type ActivePrototypeState = {
  active: PrototypeId | null;
  setActive: (active: PrototypeId | null) => void;
};

export const useActivePrototypeStore = create<ActivePrototypeState>()(
  persist(
    (set) => ({
      active: null,
      setActive: (active) => set({ active }),
    }),
    {
      name: 'mm-prototype',
      // localStorage may throw in a private window; then nothing is kept.
      storage: createJSONStorage(() => localStorage),
      partialize: ({ active }) => ({ active }),
    }
  )
);

export function useActivePrototype(): PrototypeId | null {
  const active = useActivePrototypeStore((state) => state.active);
  return import.meta.env.DEV ? active : null;
}

export function usePrototypeActive(id: PrototypeId): boolean {
  return useActivePrototype() === id;
}
