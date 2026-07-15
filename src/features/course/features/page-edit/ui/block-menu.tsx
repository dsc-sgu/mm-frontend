import { useState, type ReactNode } from 'react';
import type { Path, SlateEditor } from 'platejs';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shadcn/components/ui/dropdown-menu';
import {
  duplicateBlock,
  duplicateBlockById,
  insertParagraphRelative,
  insertParagraphRelativeById,
  moveBlockDown,
  moveBlockDownById,
  moveBlockUp,
  moveBlockUpById,
  removeBlock,
  removeBlockById,
  transformBlock,
  transformBlockById,
  type CreatePlateBlockInput,
} from '@/features/course/features/page-edit/model/block-operations';
import type { CoursePageBlockSelectionTarget } from '@/features/course/features/page-edit/model/block-selection';

type CoursePageBlockMenuTriggerProps = {
  openMenu: () => void;
};

type CoursePageBlockMenuProps = {
  children: (props: CoursePageBlockMenuTriggerProps) => ReactNode;
  editor: SlateEditor;
  onOpen: () => void;
  target: CoursePageBlockSelectionTarget;
};

type TransformBlockOption = {
  input: CreatePlateBlockInput;
  label: string;
};

const TRANSFORM_BLOCK_OPTIONS: TransformBlockOption[] = [
  { label: 'Текст', input: { type: 'paragraph' } },
  { label: 'Заголовок 1', input: { type: 'heading', level: 1 } },
  { label: 'Заголовок 2', input: { type: 'heading', level: 2 } },
  { label: 'Заголовок 3', input: { type: 'heading', level: 3 } },
  { label: 'Цитата', input: { type: 'quote' } },
  {
    label: 'Маркированный список',
    input: { type: 'list', variant: 'unordered' },
  },
  {
    label: 'Нумерованный список',
    input: { type: 'list', variant: 'ordered' },
  },
  { label: 'Код', input: { type: 'code' } },
  { label: 'Спойлер', input: { type: 'spoiler' } },
];

function runTargetedBlockOperation({
  runById,
  runByPath,
  target,
}: {
  runById: (id: string) => boolean;
  runByPath: (path: Path) => boolean;
  target: CoursePageBlockSelectionTarget;
}) {
  if (target.source === 'id') {
    return runById(target.id);
  }

  return runByPath(target.path);
}

function insertParagraphAtTarget({
  editor,
  placement,
  target,
}: {
  editor: SlateEditor;
  placement: 'after' | 'before';
  target: CoursePageBlockSelectionTarget;
}) {
  return runTargetedBlockOperation({
    target,
    runById: (id) => insertParagraphRelativeById(editor, id, placement),
    runByPath: (path) => insertParagraphRelative(editor, path, placement),
  });
}

export function CoursePageBlockMenu({
  children,
  editor,
  onOpen,
  target,
}: CoursePageBlockMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  function setMenuOpen(nextIsOpen: boolean) {
    if (nextIsOpen && !isOpen) {
      onOpen();
    }

    setIsOpen(nextIsOpen);
  }

  function duplicateCurrentBlock() {
    runTargetedBlockOperation({
      target,
      runById: (id) => duplicateBlockById(editor, id),
      runByPath: (path) => duplicateBlock(editor, path),
    });
  }

  function moveCurrentBlockUp() {
    runTargetedBlockOperation({
      target,
      runById: (id) => moveBlockUpById(editor, id),
      runByPath: (path) => moveBlockUp(editor, path),
    });
  }

  function moveCurrentBlockDown() {
    runTargetedBlockOperation({
      target,
      runById: (id) => moveBlockDownById(editor, id),
      runByPath: (path) => moveBlockDown(editor, path),
    });
  }

  function removeCurrentBlock() {
    runTargetedBlockOperation({
      target,
      runById: (id) => removeBlockById(editor, id),
      runByPath: (path) => removeBlock(editor, path),
    });
  }

  function transformCurrentBlock(input: CreatePlateBlockInput) {
    runTargetedBlockOperation({
      target,
      runById: (id) => transformBlockById(editor, id, input),
      runByPath: (path) => transformBlock(editor, path, input),
    });
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
        className="w-60"
      >
        <DropdownMenuItem
          onSelect={() =>
            insertParagraphAtTarget({ editor, placement: 'before', target })
          }
        >
          Добавить выше
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            insertParagraphAtTarget({ editor, placement: 'after', target })
          }
        >
          Добавить ниже
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={duplicateCurrentBlock}>
          Дублировать
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={moveCurrentBlockUp}>
          Переместить вверх
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={moveCurrentBlockDown}>
          Переместить вниз
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Превратить в</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {TRANSFORM_BLOCK_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.label}
                onSelect={() => transformCurrentBlock(option.input)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={removeCurrentBlock}>
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
