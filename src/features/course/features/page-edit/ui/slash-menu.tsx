import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type SetStateAction,
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
import {
  applyCoursePageSlashMenuItem,
  filterCoursePageSlashMenuItems,
  getCoursePageSlashMenuState,
  hasCoursePageSlashMenuTrigger,
  type CoursePageSlashMenuItem,
} from '@/features/course/features/page-edit/model/slash-menu';

type SlashMenuPosition = {
  left: number;
  top: number;
};

type SlashMenuDismissal =
  | { status: 'ready' }
  | { status: 'dismissed'; triggerId: string };

type SlashMenuSelection = {
  index: number;
  key: string | null;
};

const READY_SLASH_MENU_DISMISSAL: SlashMenuDismissal = { status: 'ready' };
const INITIAL_SLASH_MENU_SELECTION: SlashMenuSelection = {
  index: 0,
  key: null,
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

function useSlashMenuEditorFocus(
  containerRef: RefObject<HTMLDivElement | null>
) {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    function isEditorContent(target: EventTarget | null) {
      return (
        target instanceof HTMLElement &&
        target.dataset.coursePageEditorContent === 'true' &&
        containerRef.current?.contains(target)
      );
    }

    function handleFocusIn(event: FocusEvent) {
      setIsFocused(Boolean(isEditorContent(event.target)));
    }

    function handleFocusOut(event: FocusEvent) {
      if (isEditorContent(event.relatedTarget)) {
        return;
      }

      setIsFocused(false);
    }

    window.addEventListener('focusin', handleFocusIn, true);
    window.addEventListener('focusout', handleFocusOut, true);

    return () => {
      window.removeEventListener('focusin', handleFocusIn, true);
      window.removeEventListener('focusout', handleFocusOut, true);
    };
  }, [containerRef]);

  return isFocused;
}

function useSlashMenuController({
  containerRef,
  editor,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  editor: SlateEditor;
}) {
  const value = useEditorValue();
  const isFocused = useSlashMenuEditorFocus(containerRef);
  const [dismissal, setDismissal] = useState<SlashMenuDismissal>(
    READY_SLASH_MENU_DISMISSAL
  );
  const [selection, setSelection] = useState<SlashMenuSelection>(
    INITIAL_SLASH_MENU_SELECTION
  );
  const state = getCoursePageSlashMenuState({
    selection: editor.selection,
    value,
  });

  const triggerId = state.status === 'open' ? state.triggerId : null;
  const query = state.status === 'open' ? state.query : null;
  const selectionKey =
    triggerId && query !== null ? `${triggerId}:${query}` : null;
  const dismissedTriggerExists =
    dismissal.status === 'dismissed' &&
    hasCoursePageSlashMenuTrigger({
      triggerId: dismissal.triggerId,
      value,
    });

  if (dismissal.status === 'dismissed' && !dismissedTriggerExists) {
    setDismissal(READY_SLASH_MENU_DISMISSAL);
  }

  const isDismissed =
    dismissedTriggerExists && dismissal.triggerId === triggerId;
  const isOpen = isFocused && state.status === 'open' && !isDismissed;
  const items =
    state.status === 'open' ? filterCoursePageSlashMenuItems(state.query) : [];
  const selectedIndex = selection.key === selectionKey ? selection.index : 0;
  const activeIndex = Math.min(selectedIndex, Math.max(items.length - 1, 0));
  const activeItem = items[activeIndex] ?? null;
  const setSelectedIndex = useCallback(
    (action: SetStateAction<number>) => {
      setSelection((current) => {
        const currentIndex = current.key === selectionKey ? current.index : 0;
        const nextIndex =
          typeof action === 'function' ? action(currentIndex) : action;

        return { index: nextIndex, key: selectionKey };
      });
    },
    [selectionKey]
  );

  const applyItem = useCallback(
    (item: CoursePageSlashMenuItem) => {
      if (state.status !== 'open') {
        return;
      }

      applyCoursePageSlashMenuItem({ editor, item, state });
      setDismissal(READY_SLASH_MENU_DISMISSAL);
      setSelectedIndex(0);
    },
    [editor, setSelectedIndex, state]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || event.isComposing) {
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

      if (
        event.key === 'Escape' &&
        triggerId &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        setDismissal({ status: 'dismissed', triggerId });
      }
    },
    [activeItem, applyItem, isOpen, items.length, setSelectedIndex, triggerId]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown, true);

    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleKeyDown]);

  return {
    activeIndex,
    activeItem,
    applyItem,
    isOpen,
    items,
    setSelectedIndex,
  };
}

function useSlashMenuPosition({
  containerRef,
  editor,
  isOpen,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  editor: SlateEditor;
  isOpen: boolean;
}) {
  const selectionVersion = useSelectionVersion();
  const valueVersion = useValueVersion();
  const [position, setPosition] = useState<SlashMenuPosition | null>(null);

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

  return position;
}

function useSlashMenuScroll({
  activeIndex,
  activeItemId,
  isOpen,
}: {
  activeIndex: number;
  activeItemId: string | undefined;
  isOpen: boolean;
}) {
  const commandListRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const commandList = commandListRef.current;
    const activeItemElement = activeItemRef.current;

    if (!commandList || !activeItemElement) {
      return;
    }

    if (activeIndex === 0) {
      commandList.scrollTop = 0;
      return;
    }

    const commandListRect = commandList.getBoundingClientRect();
    const activeItemRect = activeItemElement.getBoundingClientRect();

    if (activeItemRect.top < commandListRect.top) {
      commandList.scrollTop -= commandListRect.top - activeItemRect.top;
    } else if (activeItemRect.bottom > commandListRect.bottom) {
      commandList.scrollTop += activeItemRect.bottom - commandListRect.bottom;
    }
  }, [activeIndex, activeItemId, isOpen]);

  return { activeItemRef, commandListRef };
}

export function CoursePageSlashMenu({
  containerRef,
  editor,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  editor: SlateEditor;
}) {
  const {
    activeIndex,
    activeItem,
    applyItem,
    isOpen,
    items,
    setSelectedIndex,
  } = useSlashMenuController({ containerRef, editor });
  const position = useSlashMenuPosition({ containerRef, editor, isOpen });
  const { activeItemRef, commandListRef } = useSlashMenuScroll({
    activeIndex,
    activeItemId: activeItem?.id,
    isOpen,
  });

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
