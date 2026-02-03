import { type ReactNode, useState } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useMediaQuery } from '@/use-media-query.hook';
import type { Deadline } from './deadlines-calendar.types';
import { cn } from '@/lib/utils';

interface DeadlineDetailsProps {
  deadline: Deadline;
  children: ReactNode;
}

function DeadlineContent({ deadline }: { deadline: Deadline }) {
  const now = new Date();
  const isOverdue = deadline.dueDate < now;

  const formattedDate = deadline.dueDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = deadline.dueDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-base mb-1">{deadline.subjectName}</h3>
        <p className="text-sm text-muted-foreground">{deadline.taskText}</p>
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-1">Срок сдачи:</p>
        <p
          className={cn(
            'text-sm font-medium',
            isOverdue
              ? 'text-red-600 dark:text-red-400'
              : 'text-orange-600 dark:text-orange-400'
          )}
        >
          {formattedDate} в {formattedTime}
        </p>
      </div>
    </div>
  );
}

export function DeadlineDetails({ deadline, children }: DeadlineDetailsProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>{children}</HoverCardTrigger>
        <HoverCardContent className="w-80" side="top" align="start">
          <DeadlineContent deadline={deadline} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <div className="p-4 pb-6">
          <DeadlineContent deadline={deadline} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
