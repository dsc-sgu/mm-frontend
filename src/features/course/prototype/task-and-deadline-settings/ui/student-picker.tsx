// PROTOTYPE (#181): search a Student by name or Student Group.
import { useState, type ReactNode } from 'react';

import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shadcn/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { studentFullName } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  STUDENT_GROUPS,
  STUDENTS,
} from '@/features/course/prototype/task-and-deadline-settings/store';

export function StudentPicker({
  trigger,
  onPick,
  excludeIds = [],
  selectedIds,
  placeholder = 'Фамилия или группа…',
  align = 'start',
}: {
  trigger: ReactNode;
  onPick: (studentId: string) => void;
  excludeIds?: readonly string[];
  /** Several Students: items carry ticks and the list stays open. */
  selectedIds?: readonly string[];
  placeholder?: string;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-80 p-0">
        <Command>
          <CommandInput placeholder={placeholder} autoFocus />
          <CommandList>
            <CommandEmpty>Никого не нашли</CommandEmpty>
            {STUDENT_GROUPS.map((group) => (
              <CommandGroup key={group.id} heading={group.name}>
                {STUDENTS.filter(
                  (student) =>
                    student.groupId === group.id &&
                    !excludeIds.includes(student.id)
                )
                  .sort((a, b) => a.lastName.localeCompare(b.lastName))
                  .map((student) => (
                    <CommandItem
                      key={student.id}
                      value={`${studentFullName(student)} ${group.name}`}
                      onSelect={() => {
                        if (!selectedIds) {
                          setOpen(false);
                        }
                        onPick(student.id);
                      }}
                    >
                      {selectedIds ? (
                        <Checkbox
                          checked={selectedIds.includes(student.id)}
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      ) : null}
                      {studentFullName(student)}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
