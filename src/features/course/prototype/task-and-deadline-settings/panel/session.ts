// PROTOTYPE (#181): the open panel's form, shared with the Task Reference
// card so the statement can be edited in the document (`?statement=inline`).
import { createContext, useContext, useState } from 'react';

import type {
  Task,
  TaskProps,
} from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  usePrototypeSettings,
  type TaskApplyMode,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';

export type PanelContext = 'view' | 'edit';

export type PanelResult =
  | { kind: 'none' }
  | { kind: 'applied'; text: string; at: number }
  | { kind: 'draft'; at: number }
  | {
      kind: 'conflict';
      theirs: Task;
      changedFields: (keyof TaskProps)[];
    }
  /** `?taskApply=contract`: a Course publication deleted the Task. */
  | { kind: 'deleted'; at: number };

export type PanelSession = {
  taskId: string;
  context: PanelContext;
  baseVersion: number;
  base: TaskProps;
  form: TaskProps;
  keyTouched: boolean;
  expanded: boolean;
  result: PanelResult;
  setField: <K extends keyof TaskProps>(key: K, value: TaskProps[K]) => void;
  setKeyTouched: (touched: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setResult: (result: PanelResult) => void;
  /** Start over from new base values, e.g. after publishing. */
  rebase: (base: TaskProps, version: number) => void;
};

export const FIELD_LABEL: Record<keyof TaskProps, string> = {
  title: 'название',
  key: 'ключ задания',
  groupId: 'группа заданий',
  maxGrade: 'максимальный балл',
  statement: 'условие',
  annotation: 'аннотация',
  attachments: 'вложения',
  patterns: 'маски путей',
};

export function pickProps(task: Task): TaskProps {
  return {
    title: task.title,
    key: task.key,
    groupId: task.groupId,
    maxGrade: task.maxGrade,
    statement: task.statement,
    annotation: task.annotation,
    attachments: task.attachments,
    patterns: task.patterns,
  };
}

export function changedFields(base: TaskProps, form: TaskProps) {
  return (Object.keys(form) as (keyof TaskProps)[]).filter(
    (key) => JSON.stringify(base[key]) !== JSON.stringify(form[key])
  );
}

export function editsOf(base: TaskProps, form: TaskProps) {
  return Object.fromEntries(
    changedFields(base, form).map((key) => [key, form[key]])
  ) as Partial<TaskProps>;
}

type SessionState = {
  taskId: string;
  baseVersion: number;
  base: TaskProps;
  form: TaskProps;
  keyTouched: boolean;
  expanded: boolean;
  result: PanelResult;
};

function initialSession(
  taskId: string,
  taskApply: TaskApplyMode
): SessionState | null {
  const { tasks, draft } = useSandbox.getState();
  const task = tasks[taskId];

  if (!task) {
    return null;
  }

  // In A the panel continues the Teacher's own Course Draft Snapshot.
  const draftEdits =
    taskApply === 'course' ? (draft?.taskEdits[taskId] ?? {}) : {};
  const base = { ...pickProps(task), ...draftEdits };

  return {
    taskId,
    baseVersion: task.version,
    base,
    form: base,
    keyTouched: task.key !== '',
    expanded: false,
    result: { kind: 'none' },
  };
}

/** Keeps one form per open Task; switching Tasks starts a new form. */
export function usePanelSessionState(
  taskId: string | null,
  context: PanelContext
): PanelSession | null {
  const { taskApply } = usePrototypeSettings();
  const [state, setState] = useState(() =>
    taskId ? initialSession(taskId, taskApply) : null
  );
  const [stateTaskId, setStateTaskId] = useState(taskId);

  if (stateTaskId !== taskId) {
    setStateTaskId(taskId);
    setState(taskId ? initialSession(taskId, taskApply) : null);
  }

  if (!state || state.taskId !== taskId) {
    return null;
  }

  const patch = (next: Partial<SessionState>) =>
    setState((previous) => (previous ? { ...previous, ...next } : previous));

  return {
    ...state,
    context,
    setField: (key, value) =>
      setState((previous) =>
        previous
          ? {
              ...previous,
              form: { ...previous.form, [key]: value },
              result: { kind: 'none' },
            }
          : previous
      ),
    setKeyTouched: (keyTouched) => patch({ keyTouched }),
    setExpanded: (expanded) => patch({ expanded }),
    setResult: (result) => patch({ result }),
    rebase: (base, baseVersion) => patch({ base, form: base, baseVersion }),
  };
}

export const PanelSessionContext = createContext<PanelSession | null>(null);

export function usePanelSession() {
  return useContext(PanelSessionContext);
}
