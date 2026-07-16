import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react';
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListCollapse,
  ListOrdered,
  Quote,
  type LucideIcon,
} from 'lucide-react';
import {
  useEditorValue,
  useSelectionVersion,
  useValueVersion,
} from 'platejs/react';
import type { SlateEditor } from 'platejs';

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/shadcn/components/ui/command';
import { cn } from '@/shadcn/lib/utils';
import { useSlashMenuScroll } from '@/features/course/features/page-edit/hooks/use-slash-menu-scroll';
import {
  applyCoursePageSlashMenuItem,
  filterCoursePageSlashMenuItems,
  getCoursePageSlashMenuState,
  type CoursePageSlashMenuItem,
} from '@/features/course/features/page-edit/model/slash-menu';

type SlashMenuPosition = {
  left: number;
  top: number;
};

const ICON_BY_SLASH_MENU_ITEM_ID: Record<string, LucideIcon> = {
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  quote: Quote,
  'bulleted-list': List,
  'ordered-list': ListOrdered,
  code: Code2,
  spoiler: ListCollapse,
};

function getSlashMenuTriggerKey({
  blockPath,
  query,
}: Extract<
  ReturnType<typeof getCoursePageSlashMenuState>,
  { status: 'open' }
>) {
  return `${blockPath.join('.')}:${query}`;
}

export function CoursePageSlashMenu({
  containerRef,
  editor,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  editor: SlateEditor;
}) {
  const value = useEditorValue();
  const selectionVersion = useSelectionVersion();
  const valueVersion = useValueVersion();
  const [dismissedTriggerKey, setDismissedTriggerKey] = useState<string | null>(
    null
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<SlashMenuPosition | null>(null);
  const state = getCoursePageSlashMenuState({
    selection: editor.selection,
    value,
  });

  const triggerKey =
    state.status === 'open' ? getSlashMenuTriggerKey(state) : null;
  const isOpen = state.status === 'open' && dismissedTriggerKey !== triggerKey;
  const items =
    state.status === 'open' ? filterCoursePageSlashMenuItems(state.query) : [];
  const activeIndex = Math.min(selectedIndex, Math.max(items.length - 1, 0));
  const activeItem = items[activeIndex] ?? null;
  const { activeItemRef, commandListRef } = useSlashMenuScroll({
    activeIndex,
    activeItemId: activeItem?.id,
    isOpen,
  });

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const selection = editor.selection;

      if (!selection || !containerRef.current) {
        return;
      }

      const range = editor.api.toDOMRange(selection);

      if (!range) {
        return;
      }

      const rangeRect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setPosition({
        left: rangeRect.left - containerRect.left,
        top: rangeRect.bottom - containerRect.top + 8,
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [containerRef, editor, isOpen, selectionVersion, valueVersion]);

  const applyItem = useCallback(
    (item: CoursePageSlashMenuItem) => {
      if (state.status !== 'open') {
        return;
      }

      applyCoursePageSlashMenuItem({ editor, item, state });
      setDismissedTriggerKey(null);
      setSelectedIndex(0);
    },
    [editor, state]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      if (event.key === 'ArrowDown') {
        if (items.length === 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((current) => (current + 1) % items.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        if (items.length === 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(
          (current) => (current - 1 + items.length) % items.length
        );
        return;
      }

      if (event.key === 'Enter' && activeItem) {
        event.preventDefault();
        event.stopPropagation();
        applyItem(activeItem);
        return;
      }

      if (event.key === 'Escape' && triggerKey) {
        event.preventDefault();
        event.stopPropagation();
        setDismissedTriggerKey(triggerKey);
      }
    },
    [activeItem, applyItem, isOpen, items.length, triggerKey]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown, true);

    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !position) {
    return null;
  }

  return (
    <div
      contentEditable={false}
      className="absolute z-50 w-80 overflow-hidden rounded-xl border bg-popover p-1 shadow-lg"
      style={position}
    >
      <Command value={activeItem?.id} shouldFilter={false}>
        <CommandList ref={commandListRef}>
          <CommandGroup heading="Добавить блок">
            {items.map((item, index) => {
              const Icon = ICON_BY_SLASH_MENU_ITEM_ID[item.id];

              return (
                <CommandItem
                  ref={index === activeIndex ? activeItemRef : undefined}
                  key={item.id}
                  value={item.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setSelectedIndex(index)}
                  onSelect={() => applyItem(item)}
                >
                  <Icon />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </CommandItem>
              );
            })}
            {items.length === 0 && (
              <p
                className={cn(
                  'px-2 py-6 text-center text-sm text-muted-foreground'
                )}
              >
                Ничего не найдено
              </p>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
