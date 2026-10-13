// PROTOTYPE (#181): deadline screen variants. A — matrix «Task × Student
// Group» and D — timeline at `/deadlines`; B — Task list with a side panel at
// `/tasks`. All share the store, the save flow and the mass shift dialog.
import { useState, type ReactNode } from 'react';
import { CalendarArrowUp } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import {
  dockOffset,
  dockPadding,
} from '@/features/course/prototype/task-and-deadline-settings/panel/layout';
import { SandboxBar } from '@/features/course/prototype/task-and-deadline-settings/sandbox-bar';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import { timeZoneLabel } from '@/features/course/prototype/task-and-deadline-settings/time';
import { BulkBar } from '@/features/course/prototype/task-and-deadline-settings/ui/bulk-bar';
import {
  DeadlineText,
  NoDeadline,
} from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';
import {
  ScheduleDock,
  ScheduleStatus,
} from '@/features/course/prototype/task-and-deadline-settings/ui/schedule-save-bar';
import {
  ShiftDialog,
  type ShiftPreset,
} from '@/features/course/prototype/task-and-deadline-settings/ui/shift-dialog';
import { MatrixView } from './matrix';
import { TaskListView } from './task-list';
import { TimelineView } from './timeline';

export type DeadlinesViewProps = {
  courseSlug: string;
  selection: ReadonlySet<string>;
  setSelection: (selection: ReadonlySet<string>) => void;
  onShift: (preset: ShiftPreset) => void;
};

export function DeadlinesPrototypePage({ courseSlug }: { courseSlug: string }) {
  const { variant, task } = usePrototypeSettings();
  const panelOpen = variant === 'B' && Boolean(task);
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [shift, setShift] = useState<ShiftPreset | null>(null);

  const viewProps: DeadlinesViewProps = {
    courseSlug,
    selection,
    setSelection,
    onShift: setShift,
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
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {variant === 'B' ? 'Задания и сроки' : 'Сроки'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Время в поясе {timeZoneLabel()}. Сроки применяются отдельно от
            публикации курса.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScheduleStatus />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShift({ taskIds: [...selection] })}
          >
            <CalendarArrowUp />
            Сдвинуть сроки
          </Button>
        </div>
      </header>

      {variant === 'B' ? null : <Legend />}

      {variant === 'A' ? <MatrixView {...viewProps} /> : null}
      {variant === 'B' ? <TaskListView {...viewProps} /> : null}
      {variant === 'D' ? <TimelineView {...viewProps} /> : null}

      <ScheduleDock>
        <BulkBar
          count={selection.size}
          onClear={() => setSelection(new Set())}
          onShift={() => setShift({ taskIds: [...selection] })}
        />
      </ScheduleDock>
      <ShiftDialog preset={shift} onClose={() => setShift(null)} />
      <SandboxBar courseSlug={courseSlug} />
    </main>
  );
}

function LegendItem({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5">{children}</span>;
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <LegendItem>
        <DeadlineText
          value={{ kind: 'inherit' }}
          inherited={{ kind: 'at', at: Date.UTC(2026, 9, 27, 19, 59) }}
          compact
        />
        наследует общий срок
      </LegendItem>
      <LegendItem>
        <DeadlineText
          value={{ kind: 'at', at: Date.UTC(2026, 9, 29, 19, 59) }}
          compact
        />
        задан явно
      </LegendItem>
      <LegendItem>
        <NoDeadline /> явно без срока
      </LegendItem>
      <LegendItem>
        <span className="h-3.5 w-1 rounded-sm bg-amber-500" />
        не применено
      </LegendItem>
    </div>
  );
}
