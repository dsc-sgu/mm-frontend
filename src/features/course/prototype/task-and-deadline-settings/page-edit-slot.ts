// PROTOTYPE (#181): lets `?taskApply=contract` hook into the Course Page
// editor's «Применить»: publishing the page also creates and deletes Tasks.
// The production editor ignores it when unset.
import { createContext, useContext, type ReactNode } from 'react';

import type { CourseContentBlockItem } from '@/features/course/features/page/model/types';

export type PrototypePageEditSlot = {
  /** Rendered inside the editor store provider. */
  render: () => ReactNode;
  /** False stops «Применить», e.g. while a new Task is unfinished. */
  beforeApply: (content: CourseContentBlockItem[]) => boolean;
  /** Runs in the same publication as the page. */
  afterApply: (content: CourseContentBlockItem[]) => Promise<void>;
};

export const PrototypePageEditContext =
  createContext<PrototypePageEditSlot | null>(null);

export function usePrototypePageEdit() {
  return useContext(PrototypePageEditContext);
}
