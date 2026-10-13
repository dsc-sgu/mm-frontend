// PROTOTYPE (#181): one in-memory sandbox shared by every variant. State is
// not persisted: a reload returns the fixture.
import { useMemo } from 'react';
import { create } from 'zustand';

import {
  ATTEMPTS,
  OTHER_TEACHER,
  OWN_DRAFT_PAGE_EDITS,
  SCHEDULE,
  STUDENT_GROUPS,
  STUDENTS,
  TASK_GROUPS,
  TASKS,
  type Task,
  type TaskGroup,
  type TaskProps,
} from './fixture';
import {
  applyCommands,
  overrideKey,
  type DeadlineCommand,
  type Schedule,
  type TaskSchedule,
} from './schedule';
import { NOW } from './time';

export type CourseAccess = 'draft' | 'open';

export type CourseDraft = {
  /** Page edits of this Teacher that are not published yet. */
  pageEdits: string[];
  taskEdits: Record<string, Partial<TaskProps>>;
  /** Another Teacher published the Course after this draft was based. */
  stale: boolean;
};

export type Lease =
  | { holder: 'nobody' }
  | { holder: 'me' }
  | { holder: 'other'; since: number };

export type SaveState =
  | { status: 'idle' }
  | { status: 'saving'; label: string }
  | { status: 'saved'; label: string; at: number }
  | { status: 'failed'; label: string; commands: DeadlineCommand[] };

export type LogTone = 'task' | 'schedule' | 'course' | 'conflict' | 'world';

export type LogEntry = { id: number; at: number; text: string; tone: LogTone };

export type TaskPublishResult =
  | { status: 'published'; version: number }
  | { status: 'conflict'; theirs: Task; changedFields: (keyof TaskProps)[] };

type SandboxState = {
  courseAccess: CourseAccess;
  tasks: Record<string, Task>;
  taskGroups: TaskGroup[];
  schedule: Schedule;
  /** Deadline commands waiting for «Применить» in `?apply=batch`. */
  pending: DeadlineCommand[];
  draft: CourseDraft | null;
  lease: Lease;
  /** Scenario 5: another Teacher publishes the same Task meanwhile. */
  concurrentEdit: boolean;
  failNextSave: boolean;
  save: SaveState;
  log: LogEntry[];
  lastApplied: { taskIds: string[]; at: number } | null;
  /** Tasks created in this session and not yet published. */
  newTaskIds: string[];
};

type SandboxActions = {
  reset: () => void;
  setCourseAccess: (access: CourseAccess) => void;
  setOwnDraft: (on: boolean) => void;
  setStaleDraft: (on: boolean) => void;
  setLeaseByOther: (on: boolean) => void;
  setConcurrentEdit: (on: boolean) => void;
  setFailNextSave: (on: boolean) => void;

  queue: (commands: DeadlineCommand[]) => void;
  dropPending: (keys: ReadonlySet<string>) => void;
  discardPending: () => void;
  saveSchedule: (
    commands: DeadlineCommand[],
    label: string
  ) => Promise<boolean>;
  /** Applies the whole batch, or only one Task's part of it. */
  applyPending: (taskId?: string) => Promise<boolean>;
  retrySave: () => Promise<boolean>;

  writeTaskToDraft: (taskId: string, edits: Partial<TaskProps>) => void;
  publishCourse: () => Promise<void>;
  rebaseDraft: () => void;
  publishTask: (
    taskId: string,
    edits: Partial<TaskProps>,
    baseVersion: number
  ) => Promise<TaskPublishResult>;

  createTask: (
    taskId: string,
    carry: { from: string; schedule: TaskSchedule } | null
  ) => void;
  /** Unpublished new Tasks keep their props right in the sandbox. */
  saveNewTask: (taskId: string, props: TaskProps) => void;
  updateTaskGroup: (
    groupId: string,
    patch: Partial<Pick<TaskGroup, 'title' | 'key'>>
  ) => void;
};

export type Sandbox = SandboxState & SandboxActions;

let logSequence = 0;

function initialState(): SandboxState {
  return {
    courseAccess: 'open',
    tasks: structuredClone(TASKS),
    taskGroups: structuredClone(TASK_GROUPS),
    schedule: structuredClone(SCHEDULE),
    pending: [],
    draft: null,
    lease: { holder: 'nobody' },
    concurrentEdit: false,
    failNextSave: false,
    save: { status: 'idle' },
    log: [],
    lastApplied: null,
    newTaskIds: [],
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The change key a command touches, to drop it from the pending batch. */
export function commandKey(command: DeadlineCommand) {
  switch (command.type) {
    case 'set-task-deadline':
      return `${command.taskId}|task`;
    case 'set-opening-time':
      return `${command.taskId}|opening`;
    default:
      return overrideKey(command.taskId, command.target);
  }
}

function emptyDraft(): CourseDraft {
  return { pageEdits: [], taskEdits: {}, stale: false };
}

export const useSandbox = create<Sandbox>()((set, get) => {
  function log(text: string, tone: LogTone) {
    logSequence += 1;
    set((state) => ({
      log: [{ id: logSequence, at: Date.now(), text, tone }, ...state.log],
    }));
  }

  async function runSave(commands: DeadlineCommand[], label: string) {
    set({ save: { status: 'saving', label } });
    await wait(450);

    if (get().failNextSave) {
      set({
        failNextSave: false,
        save: { status: 'failed', label, commands },
      });
      log(`Сбой сохранения сроков: ${label}`, 'conflict');
      return false;
    }

    const taskIds = [...new Set(commands.map((command) => command.taskId))];
    set((state) => ({
      schedule: applyCommands(state.schedule, commands),
      save: { status: 'saved', label, at: Date.now() },
      lastApplied: { taskIds, at: Date.now() },
    }));
    log(`Сроки применены: ${label}`, 'schedule');
    return true;
  }

  return {
    ...initialState(),

    reset: () => {
      set(initialState());
      log('Песочница сброшена к fixture', 'world');
    },

    setCourseAccess: (courseAccess) => {
      set({ courseAccess });
      log(
        courseAccess === 'open'
          ? 'Course открыт Students'
          : 'Course переведён в draft',
        'world'
      );
    },

    setOwnDraft: (on) => {
      set((state) => ({
        draft: on
          ? {
              ...(state.draft ?? emptyDraft()),
              pageEdits: OWN_DRAFT_PAGE_EDITS,
            }
          : null,
      }));
      log(
        on
          ? 'У вас есть неопубликованный черновик с правками страницы'
          : 'Черновик курса удалён',
        'world'
      );
    },

    setStaleDraft: (on) => {
      set((state) => ({
        draft: on
          ? {
              ...(state.draft ?? {
                ...emptyDraft(),
                pageEdits: OWN_DRAFT_PAGE_EDITS,
              }),
              stale: true,
            }
          : state.draft && { ...state.draft, stale: false },
      }));
      log(
        on
          ? `${OTHER_TEACHER.shortName} опубликовал курс после вашего черновика`
          : 'Черновик снова актуален',
        'world'
      );
    },

    setLeaseByOther: (on) => {
      set({
        lease: on
          ? { holder: 'other', since: NOW - 20 * 60 * 1000 }
          : {
              holder: 'nobody',
            },
      });
      log(
        on
          ? `Course Editing Lease у ${OTHER_TEACHER.shortName}`
          : 'Course Editing Lease свободен',
        'world'
      );
    },

    setConcurrentEdit: (on) => {
      set({ concurrentEdit: on });
      log(
        on
          ? `${OTHER_TEACHER.shortName} правит ту же Task`
          : 'Никто больше не правит Task',
        'world'
      );
    },

    setFailNextSave: (on) => set({ failNextSave: on }),

    queue: (commands) => {
      if (commands.length === 0) {
        return;
      }

      set((state) => ({ pending: [...state.pending, ...commands] }));
    },

    dropPending: (keys) =>
      set((state) => ({
        pending: state.pending.filter(
          (command) => !keys.has(commandKey(command))
        ),
      })),

    discardPending: () => set({ pending: [] }),

    saveSchedule: (commands, label) => runSave(commands, label),

    applyPending: async (taskId) => {
      const commands = get().pending.filter(
        (command) => !taskId || command.taskId === taskId
      );

      if (commands.length === 0) {
        return true;
      }

      // Applied commands leave the batch only after a successful save.
      const ok = await runSave(commands, `${commands.length} правок`);

      if (ok) {
        set((state) => ({
          pending: state.pending.filter(
            (command) => !commands.includes(command)
          ),
        }));
      }

      return ok;
    },

    retrySave: async () => {
      const { save } = get();

      if (save.status !== 'failed') {
        return true;
      }

      const ok = await runSave(save.commands, save.label);

      if (ok) {
        set((state) => ({
          pending: state.pending.filter(
            (command) => !save.commands.includes(command)
          ),
        }));
      }

      return ok;
    },

    writeTaskToDraft: (taskId, edits) => {
      const { lease, tasks } = get();

      set((state) => {
        const draft = state.draft ?? emptyDraft();
        return {
          lease: { holder: 'me' },
          draft: {
            ...draft,
            taskEdits: {
              ...draft.taskEdits,
              [taskId]: { ...draft.taskEdits[taskId], ...edits },
            },
          },
        };
      });

      if (lease.holder === 'nobody') {
        log('Вы взяли Course Editing Lease', 'course');
      }

      log(
        `В черновик курса: Task «${tasks[taskId]?.title ?? taskId}» — ${Object.keys(edits).length} полей`,
        'course'
      );
    },

    publishCourse: async () => {
      await wait(500);
      const { draft, tasks } = get();

      if (!draft) {
        return;
      }

      const taskIds = Object.keys(draft.taskEdits);
      const nextTasks = { ...tasks };
      for (const taskId of taskIds) {
        const task = nextTasks[taskId];
        if (task) {
          nextTasks[taskId] = {
            ...task,
            ...draft.taskEdits[taskId],
            version: task.version + 1,
          };
        }
      }

      const parts = [
        ...draft.pageEdits,
        ...taskIds.map((taskId) => `Task «${nextTasks[taskId]?.title}»`),
      ];

      set({
        tasks: nextTasks,
        draft: null,
        lease: { holder: 'nobody' },
        lastApplied: { taskIds, at: Date.now() },
        newTaskIds: [],
      });
      log(`Опубликован курс целиком: ${parts.join('; ')}`, 'course');
    },

    rebaseDraft: () => {
      set((state) => ({
        draft: state.draft && { ...state.draft, stale: false },
      }));
      log(
        'Черновик пересобран на последней версии курса; правки страницы перенесены вручную',
        'course'
      );
    },

    publishTask: async (taskId, edits, baseVersion) => {
      await wait(450);
      const { tasks, concurrentEdit } = get();
      const current = tasks[taskId]!;

      if (concurrentEdit && current.version === baseVersion) {
        const theirs: Task = {
          ...current,
          statement: current.statement.replace(
            /\.$/,
            '. Уточнение: сдавать до 23:59 по времени Саратова.'
          ),
          annotation: current.annotation || 'Уточнены условия сдачи.',
          version: current.version + 1,
        };
        set({
          concurrentEdit: false,
          tasks: { ...tasks, [taskId]: theirs },
        });
        log(
          `${OTHER_TEACHER.shortName} опубликовал Task «${current.title}» (версия ${theirs.version})`,
          'conflict'
        );
        return {
          status: 'conflict',
          theirs,
          changedFields: ['statement', 'annotation'],
        };
      }

      if (current.version !== baseVersion) {
        return {
          status: 'conflict',
          theirs: current,
          changedFields: ['statement', 'annotation'],
        };
      }

      const next = { ...current, ...edits, version: current.version + 1 };
      set({
        tasks: { ...tasks, [taskId]: next },
        lastApplied: { taskIds: [taskId], at: Date.now() },
      });
      log(
        `Опубликована Task «${next.title}» (версия ${next.version}): ${Object.keys(edits).join(', ')}`,
        'task'
      );
      return { status: 'published', version: next.version };
    },

    createTask: (taskId, carry) => {
      const { tasks, taskGroups, schedule } = get();

      if (tasks[taskId]) {
        return;
      }

      const source = carry ? tasks[carry.from] : undefined;
      let groupId = source?.groupId;
      let groups = taskGroups;

      if (groupId) {
        groups = taskGroups.map((group) =>
          group.id === groupId
            ? { ...group, taskIds: [...group.taskIds, taskId] }
            : group
        );
      } else {
        groupId = `tg-${taskId}`;
        groups = [
          ...taskGroups,
          {
            id: groupId,
            title: 'Новая группа',
            key: `group-${taskGroups.length + 1}`,
            template: { state: 'empty' },
            taskIds: [taskId],
          },
        ];
      }

      set({
        tasks: {
          ...tasks,
          [taskId]: {
            id: taskId,
            title: '',
            key: '',
            groupId,
            maxGrade: source?.maxGrade ?? null,
            statement: '',
            annotation: '',
            attachments: [],
            patterns: [],
            version: 0,
          },
        },
        taskGroups: groups,
        schedule: {
          ...schedule,
          tasks: {
            ...schedule.tasks,
            [taskId]: carry?.schedule ?? {
              deadline: { kind: 'none' },
              openingTime: null,
            },
          },
        },
        newTaskIds: [...get().newTaskIds, taskId],
      });
      log(
        source
          ? `Создана Task после «${source.title}»: перенесены группа, Grade, сроки`
          : 'Создана Task в новой Task Group',
        'task'
      );
    },

    saveNewTask: (taskId, props) => {
      const { tasks, taskGroups } = get();
      const task = tasks[taskId];

      if (!task) {
        return;
      }

      let groups = taskGroups;
      if (props.groupId !== task.groupId) {
        groups = taskGroups
          .map((group) =>
            group.id === task.groupId
              ? {
                  ...group,
                  taskIds: group.taskIds.filter((id) => id !== taskId),
                }
              : group.id === props.groupId
                ? { ...group, taskIds: [...group.taskIds, taskId] }
                : group
          )
          // A Task Group exists only while it has Tasks.
          .filter((group) => group.taskIds.length > 0);
      }

      set({
        tasks: { ...tasks, [taskId]: { ...task, ...props } },
        taskGroups: groups,
      });
      log(
        `Новая Task «${props.title}» сохранена; появится у Students после публикации курса`,
        'task'
      );
    },

    updateTaskGroup: (groupId, patch) =>
      set((state) => ({
        taskGroups: state.taskGroups.map((group) =>
          group.id === groupId ? { ...group, ...patch } : group
        ),
      })),
  };
});

/** The schedule a Teacher sees: applied values plus the pending batch. */
export function useViewSchedule() {
  const schedule = useSandbox((state) => state.schedule);
  const pending = useSandbox((state) => state.pending);

  return useMemo(
    () => (pending.length ? applyCommands(schedule, pending) : schedule),
    [schedule, pending]
  );
}

export function useOrderedTasks() {
  const tasks = useSandbox((state) => state.tasks);
  const taskGroups = useSandbox((state) => state.taskGroups);

  return useMemo(
    () =>
      taskGroups.map((group) => ({
        group,
        tasks: group.taskIds
          .map((taskId) => tasks[taskId])
          .filter((task): task is Task => Boolean(task)),
      })),
    [tasks, taskGroups]
  );
}

export { ATTEMPTS, STUDENTS, STUDENT_GROUPS };
