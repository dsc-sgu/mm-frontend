// PROTOTYPE (#181): lets the prototype render Task References inside the real
// Course Page and its editor. Production renderers fall back when unset.
import { createContext, useContext, type ReactNode } from 'react';

export type AssignmentRenderer = (reference: {
  taskId: string;
  blockId: string;
}) => ReactNode;

export const PrototypeAssignmentContext =
  createContext<AssignmentRenderer | null>(null);

export function usePrototypeAssignment() {
  return useContext(PrototypeAssignmentContext);
}
