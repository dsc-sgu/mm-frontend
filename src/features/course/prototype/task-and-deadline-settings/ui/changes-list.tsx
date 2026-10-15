// PROTOTYPE (#181): compact «было → стало» list of schedule changes.
import { X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import type {
  Schedule,
  ScheduleChange,
} from '@/features/course/prototype/task-and-deadline-settings/schedule';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  changeTarget,
  inheritedValue,
} from '@/features/course/prototype/task-and-deadline-settings/ui/change-labels';
import { ValueChange } from '@/features/course/prototype/task-and-deadline-settings/ui/deadline-text';

export function ChangesList({
  changes,
  before,
  after,
  onRevert,
  showTask = true,
}: {
  changes: ScheduleChange[];
  before: Schedule;
  after: Schedule;
  onRevert?: (key: string) => void;
  showTask?: boolean;
}) {
  const tasks = useSandbox((state) => state.tasks);

  return (
    <ul className="grid gap-1 text-sm">
      {changes.map((change) => (
        <li key={change.key} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate">
            {showTask ? (
              <span className="text-muted-foreground">
                {tasks[change.taskId]?.title},{' '}
              </span>
            ) : null}
            {changeTarget(change)}
          </span>
          <ValueChange
            before={change.before}
            after={change.after}
            inheritedBefore={inheritedValue(before, change)}
            inheritedAfter={inheritedValue(after, change)}
            defaultTime={change.level === 'opening' ? '00:00' : '23:59'}
          />
          {onRevert ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Отменить эту правку"
              onClick={() => onRevert(change.key)}
            >
              <X />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
