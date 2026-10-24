// PROTOTYPE (#181): lets `taskApply: contract` and `blocks` hook into the
// Course Page editor's «Применить»: publishing the page also creates and
// deletes Tasks, and `blocks` merges block drafts. The production editor
// ignores it when unset.
import { createContext, useContext, type ReactNode } from 'react';

import type { CourseContentBlockItem } from '@/features/course/features/page/model/types';

export type PrototypePageEditSlot = {
  /** Rendered inside the editor store provider. */
  render: () => ReactNode;
  /**
   * The content to publish, or null to stop «Применить», e.g. while a new
   * Task is unfinished or block drafts conflict.
   */
  beforeApply: (
    content: CourseContentBlockItem[]
  ) => CourseContentBlockItem[] | null;
  /** Runs in the same publication as the page. */
  afterApply: (content: CourseContentBlockItem[]) => Promise<void>;
  /** A mark beside a top-level block, e.g. «в черновике». */
  blockMark?: (blockId: string) => ReactNode;
};

export const PrototypePageEditContext =
  createContext<PrototypePageEditSlot | null>(null);

export function usePrototypePageEdit() {
  return useContext(PrototypePageEditContext);
}
