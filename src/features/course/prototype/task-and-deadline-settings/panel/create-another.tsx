// PROTOTYPE (#181): «Создать ещё» stays in place while the Course is open,
// disabled, with the reason in a tooltip.
import { CopyPlus } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { useTaskCreationBlock } from '@/features/course/prototype/task-and-deadline-settings/editor/new-task';

export function CreateAnotherButton({ onClick }: { onClick: () => void }) {
  const blocked = useTaskCreationBlock();

  if (!blocked) {
    return (
      <Button variant="outline" onClick={onClick}>
        <CopyPlus /> Создать ещё
      </Button>
    );
  }

  // A disabled button gets no pointer events, so the span carries the tooltip.
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex rounded-md">
            <Button variant="outline" disabled>
              <CopyPlus /> Создать ещё
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{blocked}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
