import { useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Code2,
  Copy,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListCollapse,
  ListOrdered,
  Plus,
  Quote,
  Trash2,
  Type,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { BlockMenuPlugin } from '@platejs/selection/react';
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
import type { CoursePageBlockTarget } from '@/features/course/features/page-edit/model/block-target';

type CoursePageBlockMenuTriggerProps = {
  openMenu: () => void;
};

type CoursePageBlockMenuProps = {
  children: (props: CoursePageBlockMenuTriggerProps) => ReactNode;
  editor: SlateEditor;
  onOpen: () => void;
  target: CoursePageBlockTarget;
};

type TransformBlockOption = {
  icon: LucideIcon;
  input: CreatePlateBlockInput;
  label: string;
};

const TRANSFORM_BLOCK_OPTIONS: TransformBlockOption[] = [
  { label: 'Текст', icon: Type, input: { type: 'paragraph' } },
  {
    label: 'Заголовок 1',
    icon: Heading1,
    input: { type: 'heading', level: 1 },
  },
  {
    label: 'Заголовок 2',
    icon: Heading2,
    input: { type: 'heading', level: 2 },
  },
  {
    label: 'Заголовок 3',
    icon: Heading3,
    input: { type: 'heading', level: 3 },
  },
  { label: 'Цитата', icon: Quote, input: { type: 'quote' } },
  {
    label: 'Маркированный список',
    icon: List,
    input: { type: 'list', variant: 'unordered' },
  },
  {
    label: 'Нумерованный список',
    icon: ListOrdered,
    input: { type: 'list', variant: 'ordered' },
  },
  { label: 'Код', icon: Code2, input: { type: 'code' } },
  { label: 'Спойлер', icon: ListCollapse, input: { type: 'spoiler' } },
];

function runTargetedBlockOperation({
  runById,
  runByPath,
  target,
}: {
  runById: (id: string) => boolean;
  runByPath: (path: Path) => boolean;
  target: CoursePageBlockTarget;
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
  target: CoursePageBlockTarget;
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
    const blockMenu = editor.getApi(BlockMenuPlugin).blockMenu;

    if (nextIsOpen && !isOpen) {
      onOpen();
      blockMenu.show(
        target.source === 'id' ? target.id : `path:${target.path.join('.')}`
      );
    } else if (!nextIsOpen && isOpen) {
      blockMenu.hide();
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
          <Plus />
          Добавить выше
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            insertParagraphAtTarget({ editor, placement: 'after', target })
          }
        >
          <Plus />
          Добавить ниже
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={duplicateCurrentBlock}>
          <Copy />
          Дублировать
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={moveCurrentBlockUp}>
          <ArrowUp />
          Переместить вверх
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={moveCurrentBlockDown}>
          <ArrowDown />
          Переместить вниз
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Wand2 />
            Превратить в
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {TRANSFORM_BLOCK_OPTIONS.map((option) => {
              const Icon = option.icon;

              return (
                <DropdownMenuItem
                  key={option.label}
                  onSelect={() => transformCurrentBlock(option.input)}
                >
                  <Icon />
                  {option.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={removeCurrentBlock}>
          <Trash2 />
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
