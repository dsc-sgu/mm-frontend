import { useState, type ReactNode } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shadcn/components/ui/dropdown-menu';

type CoursePageBlockMenuTriggerProps = {
  openMenu: () => void;
};

export function CoursePageBlockMenu({
  children,
  onOpen,
}: {
  children: (props: CoursePageBlockMenuTriggerProps) => ReactNode;
  onOpen: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function setMenuOpen(nextIsOpen: boolean) {
    if (nextIsOpen && !isOpen) {
      onOpen();
    }

    setIsOpen(nextIsOpen);
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        {children({ openMenu: () => setMenuOpen(true) })}
      </DropdownMenuTrigger>
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
