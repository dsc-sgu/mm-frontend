// PROTOTYPE (#181): variant C — deadlines inside the Course Page editor.
// The real Plate editor renders; Task References get deadline chips, the
// Task panel opens from them (scenario 1, edit mode), «/Task» creates a Task.
// Under `?taskApply=contract` «Применить» also creates and deletes Tasks.
import { useCallback, useState, type ReactNode } from 'react';
import { FileStack, LoaderCircle } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { PrototypeAssignmentContext } from '@/features/course/prototype/task-and-deadline-settings/assignment-slot';
import {
  dockOffset,
  dockPadding,
  DOCK_CENTER_LEFT,
} from '@/features/course/prototype/task-and-deadline-settings/panel/layout';
import { PrototypePageEditContext } from '@/features/course/prototype/task-and-deadline-settings/page-edit-slot';
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
import { ScheduleDock } from '@/features/course/prototype/task-and-deadline-settings/ui/schedule-save-bar';
import { useContractPageEditSlot } from './apply-slot';
import { ContractDraftStrip } from './draft-strip';
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
  const removedTaskIds = useSandbox((state) => state.removedTaskIds);
  const openTaskId =
    settings.task &&
    tasks[settings.task] &&
    !removedTaskIds.includes(settings.task)
      ? settings.task
      : null;
  const session = usePanelSessionState(openTaskId, 'edit');
  const contract = settings.taskApply === 'contract';

  const open = useCallback(
    (taskId: string) => update({ task: taskId }),
    [update]
  );
  const close = useCallback(() => update({ task: undefined }), [update]);
  const contractSlot = useContractPageEditSlot(open);

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
      <PrototypePageEditContext.Provider value={contract ? contractSlot : null}>
        <PanelSessionContext.Provider value={session}>
          <div className={dockOffset(Boolean(session), 'dock')}>
            <div
              className={cn(
                'transition-[padding] duration-200',
                dockPadding(Boolean(session), 'dock'),
                dockOffset(Boolean(session), 'dock')
              )}
            >
              {children}
            </div>
            {session ? (
              <PanelFrame
                layout="dock"
                expanded={session.expanded && settings.statement === 'expanded'}
                label="Настройка задания"
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
            <div
              style={{ left: DOCK_CENTER_LEFT }}
              className="pointer-events-none fixed top-16 z-30 grid w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 justify-items-center gap-2"
            >
              <DraftStrip />
              {contract ? <ContractDraftStrip /> : null}
              <ScheduleDock
                floating={false}
                note={
                  contract
                    ? 'Дедлайны опубликованных заданий применяются отдельно от черновика курса, новых — в черновике'
                    : 'Дедлайны применяются отдельно от черновика курса'
                }
              />
            </div>
            <SandboxBar courseSlug={courseSlug} />
          </div>
        </PanelSessionContext.Provider>
      </PrototypePageEditContext.Provider>
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
    <div className="pointer-events-auto flex w-full flex-wrap items-center gap-3 rounded-xl border bg-background px-4 py-2.5 text-sm shadow-lg">
      <FileStack className="size-4 text-violet-600" />
      <span className="min-w-0 flex-1">
        В черновике курса правки заданий:{' '}
        {entries
          .map(
            ([taskId, edits]) =>
              `«${tasks[taskId]?.title || 'Новое задание'}» (${Object.keys(
                edits
              )
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
