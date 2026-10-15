// PROTOTYPE: renders a prototype screen's controls inside the prototype bar,
// so the screen keeps them in its own state while the bar stays global.
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { PROTOTYPES_ENABLED } from './enabled';
import { useBarSlot } from './slot';

export function PrototypeBarControls({ children }: { children: ReactNode }) {
  const element = useBarSlot((state) => state.element);

  if (!PROTOTYPES_ENABLED || !element) {
    return null;
  }

  return createPortal(children, element);
}
