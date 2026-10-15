// PROTOTYPE (#181): sandbox switches chosen in the «Песочница» popover. They
// live outside the URL, so header links and reloads keep them.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ApplyMode = 'instant' | 'batch';
/**
 * How Task edits are applied (#129): A — through the Course Draft Snapshot;
 * D — a Task publication with a version check; `contract` — the contract
 * from #129: D for published Tasks, new Tasks live in the draft.
 */
export type TaskApplyMode = 'course' | 'task' | 'contract';
export type DeadlineFieldMode = 'counter' | 'full';
/**
 * Where the statement is edited. `expanded` — the panel grows and the
 * statement gets its own column with the compact editor; `expanded-page` —
 * the same, but the editor is the one of the Course Page.
 */
export type StatementMode = 'panel' | 'inline' | 'expanded' | 'expanded-page';

/** The statement has its own column once the panel is expanded. */
export function isExpandedStatement(mode: StatementMode) {
  return mode === 'expanded' || mode === 'expanded-page';
}
export type ShiftVariant = 'question' | 'sentence' | 'undo' | 'table';
export type PickerLayout = 'stack' | 'split';
export type PanelLook = 'list' | 'cards';

export type SandboxSwitches = {
  apply: ApplyMode;
  taskApply: TaskApplyMode;
  deadlineField: DeadlineFieldMode;
  statement: StatementMode;
  /** Which mass-shift window to show. */
  shift: ShiftVariant;
  /** How the date popover of a deadline or an opening time is laid out. */
  picker: PickerLayout;
  /** Task panel sections: divided by lines or as cards. */
  panelLook: PanelLook;
};

export const DEFAULT_SWITCHES: SandboxSwitches = {
  apply: 'batch',
  taskApply: 'course',
  // Verdict 13.10.2026: a Task's overrides are visible in its panel too.
  deadlineField: 'full',
  statement: 'panel',
  shift: 'question',
  // Verdict 13.10.2026: the two-column date popover.
  picker: 'split',
  // Verdict 13.10.2026: panel sections divided by lines.
  panelLook: 'list',
};

type SwitchesState = SandboxSwitches & {
  setSwitches: (patch: Partial<SandboxSwitches>) => void;
  resetSwitches: () => void;
};

export const useSandboxSwitches = create<SwitchesState>()(
  persist(
    (set) => ({
      ...DEFAULT_SWITCHES,
      setSwitches: (patch) => set(patch),
      resetSwitches: () => set(DEFAULT_SWITCHES),
    }),
    {
      name: 'mm-prototype-181-switches',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): SandboxSwitches => ({
        apply: state.apply,
        taskApply: state.taskApply,
        deadlineField: state.deadlineField,
        statement: state.statement,
        shift: state.shift,
        picker: state.picker,
        panelLook: state.panelLook,
      }),
    }
  )
);

export const SHIFT_VARIANTS: ReadonlyArray<{
  value: ShiftVariant;
  label: string;
}> = [
  { value: 'question', label: 'Вопрос' },
  { value: 'sentence', label: 'Фраза' },
  { value: 'undo', label: 'Сразу' },
  { value: 'table', label: 'Таблица' },
];
