// PROTOTYPE (#181): variant C — deadlines inside the Course Page editor.
// The real Plate editor renders; Task References get deadline chips, the
// Task panel opens from them (scenario 1, edit mode), «/Task» creates a Task.
import { useCallback, useState, type ReactNode } from 'react';
import { FileStack, LoaderCircle } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { PrototypeAssignmentContext } from '@/features/course/prototype/task-and-deadline-settings/assignment-slot';
import { PanelFrame } from '@/features/course/prototype/task-and-deadline-settings/panel/panel-frame';
import {
  FIELD_LABEL,
  PanelSessionContext,
  usePanelSessionState,
} from '@/features/course/prototype/task-and-deadline-settings/panel/session';
import { TaskPanel } from '@/features/course/prototype/task-and-deadline-settings/panel/task-panel';
import { SandboxBar } from '@/features/course/prototype/task-and-deadline-settings/sandbox-bar';
import { applyCommands } from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  usePrototypeSettings,
  useUpdatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import { ScheduleSaveBar } from '@/features/course/prototype/task-and-deadline-settings/ui/schedule-save-bar';
import { insertAfterTask, setCarry } from './new-task';
import { EditorTaskReference } from './task-reference';

export function PrototypeEditor({
  courseSlug,
  children,
}: {
  courseSlug: string;
  children: ReactNode;
}) {
  const settings = usePrototypeSettings();
  const update = useUpdatePrototypeSearch();
  const tasks = useSandbox((state) => state.tasks);
  const openTaskId =
    settings.task && tasks[settings.task] ? settings.task : null;
  const session = usePanelSessionState(openTaskId, 'edit');

  const open = useCallback(
    (taskId: string) => update({ task: taskId }),
    [update]
  );
  const close = useCallback(() => update({ task: undefined }), [update]);

  const renderCard = useCallback(
    ({ taskId, blockId }: { taskId: string; blockId: string }) => (
      <EditorTaskReference
        taskId={taskId}
        blockId={blockId}
        selected={taskId === openTaskId || blockId === openTaskId}
        onOpenPanel={open}
      />
    ),
    [open, openTaskId]
  );

  function createAnother() {
    if (!session) {
      return;
    }

    const state = useSandbox.getState();
    const view = applyCommands(state.schedule, state.pending);
    setCarry({ from: session.taskId, schedule: view.tasks[session.taskId]! });
    insertAfterTask.get(session.taskId)?.();
  }

  return (
    <PrototypeAssignmentContext.Provider value={renderCard}>
      <PanelSessionContext.Provider value={session}>
        {children}
        {session ? (
          <PanelFrame
            layout="overlay"
            expanded={session.expanded && settings.statement === 'expanded'}
            label="Настройка Task"
            onEscape={close}
          >
            <TaskPanel
              key={session.taskId}
              session={session}
              courseSlug={courseSlug}
              onClose={close}
              onCreateAnother={createAnother}
            />
          </PanelFrame>
        ) : null}
        <div className="pointer-events-none fixed top-16 left-1/2 z-30 grid w-[calc(100%-1rem)] max-w-3xl -translate-x-1/2 justify-items-center gap-2 *:pointer-events-auto">
          <DraftStrip />
          <ScheduleSaveBar
            floating={false}
            note="сроки применяются отдельно от черновика курса"
          />
        </div>
        <SandboxBar courseSlug={courseSlug} />
      </PanelSessionContext.Provider>
    </PrototypeAssignmentContext.Provider>
  );
}

/** Scenario 1 in A: Task edits wait in the Course Draft Snapshot. */
function DraftStrip() {
  const { taskApply } = usePrototypeSettings();
  const draft = useSandbox((state) => state.draft);
  const tasks = useSandbox((state) => state.tasks);
  const publishCourse = useSandbox((state) => state.publishCourse);
  const [busy, setBusy] = useState(false);
  const entries = Object.entries(draft?.taskEdits ?? {});

  if (taskApply !== 'course' || entries.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-violet-500/40 bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
      <FileStack className="size-4 text-violet-600" />
      <span className="min-w-0 flex-1">
        В черновике курса правки Task:{' '}
        {entries
          .map(
            ([taskId, edits]) =>
              `«${tasks[taskId]?.title || 'Новая Task'}» (${Object.keys(edits)
                .map((key) => FIELD_LABEL[key as keyof typeof FIELD_LABEL])
                .join(', ')})`
          )
          .join('; ')}
        . В продукте их опубликует кнопка «Применить» редактора вместе со
        страницей.
      </span>
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await publishCourse();
          setBusy(false);
        }}
      >
        {busy ? <LoaderCircle className="animate-spin" /> : null}
        Опубликовать курс
      </Button>
    </div>
  );
}
