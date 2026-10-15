// PROTOTYPE (#181, from #101): editing a Task straight from the Course view.
// `?variant=overlay` — the panel covers part of the document;
// `?variant=dock` — the document reflows next to the panel.
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/shadcn/lib/utils';
import { CoursePage } from '@/features/course/features/page/ui/page';
import type { CoursePage as CoursePageModel } from '@/features/course/features/page/model/types';
import { PrototypeAssignmentContext } from '@/features/course/prototype/task-and-deadline-settings/assignment-slot';
import {
  dockOffset,
  dockPadding,
} from '@/features/course/prototype/task-and-deadline-settings/panel/layout';
import { PanelFrame } from '@/features/course/prototype/task-and-deadline-settings/panel/panel-frame';
import {
  PanelSessionContext,
  usePanelSessionState,
} from '@/features/course/prototype/task-and-deadline-settings/panel/session';
import { TaskPanel } from '@/features/course/prototype/task-and-deadline-settings/panel/task-panel';
import { SandboxBar } from '@/features/course/prototype/task-and-deadline-settings/sandbox-bar';
import {
  usePrototypeSettings,
  useUpdatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import { NEW_TASK_ID } from '@/features/course/prototype/task-and-deadline-settings/editor/new-task';
import { revealTaskReference } from './reveal';
import { TaskReferenceCard } from './task-card';

export function PrototypeCourseView({
  course,
  courseSlug,
}: {
  course: CoursePageModel;
  courseSlug: string;
}) {
  const settings = usePrototypeSettings();
  const update = useUpdatePrototypeSearch();
  const tasks = useSandbox((state) => state.tasks);
  const openTaskId =
    settings.task && tasks[settings.task] ? settings.task : null;
  const [remembered, setRemembered] = useState(openTaskId);
  const session = usePanelSessionState(openTaskId, 'view');
  const layout = settings.variant === 'dock' ? 'dock' : 'overlay';

  const open = useCallback(
    (taskId: string) => {
      setRemembered(taskId);
      update({ task: taskId });
    },
    [update]
  );

  const close = useCallback(() => {
    update({ task: undefined });
    revealTaskReference(remembered, true);
  }, [remembered, update]);

  // Opening in dock reflows the document: keep the chosen Task in view.
  useEffect(() => {
    revealTaskReference(openTaskId);
  }, [openTaskId, layout]);

  const renderCard = useCallback(
    (reference: { taskId: string; blockId: string }) => {
      // A Task created in the editor is named by its block id.
      const taskId =
        reference.taskId === NEW_TASK_ID ? reference.blockId : reference.taskId;

      return (
        <TaskReferenceCard
          taskId={taskId}
          selected={taskId === openTaskId}
          remembered={taskId === remembered}
          onOpen={() => open(taskId)}
        />
      );
    },
    [open, openTaskId, remembered]
  );

  return (
    <PrototypeAssignmentContext.Provider value={renderCard}>
      <PanelSessionContext.Provider value={session}>
        <div className={dockOffset(Boolean(session), layout)}>
          <div
            className={cn(
              'transition-[padding] duration-200',
              dockPadding(Boolean(session), layout)
            )}
          >
            <CoursePage course={course} />
            <div className="h-24" />
          </div>
          {session ? (
            <PanelFrame
              layout={layout}
              expanded={session.expanded && settings.statement === 'expanded'}
              label="Настройка задания"
              onEscape={close}
            >
              <TaskPanel
                key={session.taskId}
                session={session}
                courseSlug={courseSlug}
                onClose={close}
                onRevealInDocument={() => revealTaskReference(openTaskId)}
              />
            </PanelFrame>
          ) : null}
          <SandboxBar courseSlug={courseSlug} />
        </div>
      </PanelSessionContext.Provider>
    </PrototypeAssignmentContext.Provider>
  );
}
