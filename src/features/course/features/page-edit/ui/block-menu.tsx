import { type ReactNode } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shadcn/components/ui/dropdown-menu';

export function CoursePageBlockMenu({
  children,
  onOpen,
}: {
  children: ReactNode;
  onOpen: () => void;
}) {
  return (
    <DropdownMenu
      onOpenChange={(isOpen) => {
        if (isOpen) {
          onOpen();
        }
      }}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="left"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuLabel>TODO</DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
