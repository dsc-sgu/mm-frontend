// PROTOTYPE (#181): deadline screen variants. A — matrix «Task × Student
// Group» and D — timeline at `/deadlines`; B — Task list with a side panel at
// `/tasks`. All share the store, the save flow and the mass shift dialog.
import { useState } from 'react';
import { CalendarArrowUp, CalendarPlus } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import {
  dockOffset,
  dockPadding,
} from '@/features/course/prototype/task-and-deadline-settings/panel/layout';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import { BulkBar } from '@/features/course/prototype/task-and-deadline-settings/ui/bulk-bar';
import { ExtendDialog } from '@/features/course/prototype/task-and-deadline-settings/ui/extend/dialog';
import type { ExtendPreset } from '@/features/course/prototype/task-and-deadline-settings/ui/extend/model';
import {
  ScheduleDock,
  ScheduleStatus,
} from '@/features/course/prototype/task-and-deadline-settings/ui/schedule-save-bar';
import {
  ShiftDialog,
  type ShiftPreset,
} from '@/features/course/prototype/task-and-deadline-settings/ui/shift-dialog';
import { ShiftToastView } from '@/features/course/prototype/task-and-deadline-settings/ui/shift/parts';
import { MatrixView, StudentColumnControl } from './matrix';
import { TaskListView } from './task-list';
import { TimelineView } from './timeline';

export type DeadlinesViewProps = {
  courseSlug: string;
  selection: ReadonlySet<string>;
  setSelection: (selection: ReadonlySet<string>) => void;
  onShift: (preset: ShiftPreset) => void;
  onExtend: (preset: ExtendPreset) => void;
  /** Matrix A: the Student whose own column is shown. */
  studentId: string | null;
};

export function DeadlinesPrototypePage({ courseSlug }: { courseSlug: string }) {
  const { variant, task } = usePrototypeSettings();
  const panelOpen = variant === 'B' && Boolean(task);
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [shift, setShift] = useState<ShiftPreset | null>(null);
  const [extend, setExtend] = useState<ExtendPreset | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  const viewProps: DeadlinesViewProps = {
    courseSlug,
    selection,
    setSelection,
    onShift: setShift,
    onExtend: setExtend,
    studentId,
  };

  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-col gap-4 px-4 pt-6 pb-44 sm:px-6',
        'max-w-[96rem]',
        dockPadding(panelOpen, 'dock'),
        dockOffset(panelOpen, 'dock')
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {variant === 'B' ? 'Задания и дедлайны' : 'Дедлайны'}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <ScheduleStatus />
          {variant === 'A' ? (
            <StudentColumnControl
              studentId={studentId}
              onChange={setStudentId}
            />
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setExtend({ taskIds: [...selection], studentIds: [] })
            }
          >
            <CalendarPlus />
            Продлить студентам
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShift({ taskIds: [...selection] })}
          >
            <CalendarArrowUp />
            Сдвинуть дедлайны
          </Button>
        </div>
      </header>

      {variant === 'A' ? <MatrixView {...viewProps} /> : null}
      {variant === 'B' ? <TaskListView {...viewProps} /> : null}
      {variant === 'D' ? <TimelineView {...viewProps} /> : null}

      <ScheduleDock>
        <ShiftToastView />
        <BulkBar
          count={selection.size}
          onClear={() => setSelection(new Set())}
          onShift={() => setShift({ taskIds: [...selection] })}
          onExtend={() =>
            setExtend({ taskIds: [...selection], studentIds: [] })
          }
        />
      </ScheduleDock>
      {/* After a shift or an extension the selection has done its job. */}
      <ShiftDialog
        preset={shift}
        onClose={() => setShift(null)}
        onApplied={() => setSelection(new Set())}
      />
      <ExtendDialog
        preset={extend}
        onClose={() => setExtend(null)}
        onApplied={() => setSelection(new Set())}
      />
    </main>
  );
}
