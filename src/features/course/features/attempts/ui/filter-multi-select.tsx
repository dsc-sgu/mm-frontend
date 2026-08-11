import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Search, X } from 'lucide-react';

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';

type FilterMultiSelectOption = {
  value: string;
  label: string;
};

type FilterMultiSelectProps = {
  id: string;
  labelId: string;
  search: string;
  placeholder: string;
  emptyMessage: string;
  options: FilterMultiSelectOption[];
  selectedOptions: FilterMultiSelectOption[];
  selectedValues: string[];
  loading: boolean;
  listClassName?: string;
  onSearchChange: (search: string) => void;
  onSelectedValuesChange: (values: string[]) => void;
};

export function FilterMultiSelect({
  id,
  labelId,
  search,
  placeholder,
  emptyMessage,
  options,
  selectedOptions,
  selectedValues,
  loading,
  listClassName,
  onSearchChange,
  onSelectedValuesChange,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = `${id}-listbox`;
  const availableOptions = options.filter(
    (option) => !selectedValues.includes(option.value)
  );

  const selectableActiveIndex =
    !loading && availableOptions.length > 0
      ? Math.min(Math.max(activeIndex, 0), availableOptions.length - 1)
      : -1;

  useEffect(() => {
    if (!open || selectableActiveIndex < 0) {
      return;
    }

    optionRefs.current[selectableActiveIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [open, selectableActiveIndex]);

  function selectValue(value: string) {
    if (selectedValues.includes(value)) {
      return;
    }

    onSelectedValuesChange(
      [...selectedValues, value].sort((first, second) =>
        first.localeCompare(second)
      )
    );
    onSearchChange('');
    setActiveIndex(0);
  }

  function removeValue(value: string) {
    onSelectedValuesChange(
      selectedValues.filter((selectedValue) => selectedValue !== value)
    );
    inputRef.current?.focus();
    setOpen(true);
    setActiveIndex(0);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === 'Backspace' &&
      search.length === 0 &&
      selectedOptions.length > 0
    ) {
      event.preventDefault();
      removeValue(selectedOptions[selectedOptions.length - 1].value);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }

      if (availableOptions.length === 0 || loading) {
        return;
      }

      setActiveIndex((currentIndex) => {
        if (currentIndex < 0) {
          return 0;
        }

        const direction = event.key === 'ArrowDown' ? 1 : -1;
        return (
          (currentIndex + direction + availableOptions.length) %
          availableOptions.length
        );
      });
      return;
    }

    if (event.key === 'Enter' && open && selectableActiveIndex >= 0) {
      const activeOption = availableOptions[selectableActiveIndex];

      if (activeOption) {
        event.preventDefault();
        selectValue(activeOption.value);
      }
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  function keepInputFocused(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setActiveIndex(nextOpen ? 0 : -1);
      }}
    >
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          className={cn(
            'relative mt-2 min-h-9 w-full cursor-text rounded-md',
            'border border-input bg-transparent shadow-xs',
            'transition-[color,box-shadow] focus-within:border-ring',
            'focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30'
          )}
          onClick={() => {
            inputRef.current?.focus();
            setOpen(true);
          }}
        >
          <Search
            className={cn(
              'pointer-events-none absolute top-2.5 left-2.5 size-4',
              'text-muted-foreground'
            )}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-1 py-1 pr-2 pl-8">
            {selectedOptions.map((option) => (
              <span
                key={option.value}
                className={cn(
                  'inline-flex max-w-[calc(100%-1.25rem)] items-center gap-1 rounded-md',
                  'bg-secondary py-0.5 pr-1 pl-2 text-xs font-medium'
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <button
                  type="button"
                  className={cn(
                    'flex size-4 shrink-0 cursor-pointer items-center justify-center',
                    'rounded-sm text-muted-foreground transition-colors',
                    'hover:bg-background hover:text-foreground focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                  aria-label={`Удалить: ${option.label}`}
                  onMouseDown={keepInputFocused}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeValue(option.value);
                  }}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              id={id}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-labelledby={labelId}
              aria-activedescendant={
                open && selectableActiveIndex >= 0
                  ? `${id}-option-${selectableActiveIndex}`
                  : undefined
              }
              value={search}
              placeholder={
                selectedOptions.length === 0 ? placeholder : undefined
              }
              className={cn(
                'h-7 border-0 bg-transparent p-0 text-sm shadow-none outline-none',
                'placeholder:text-muted-foreground',
                search ? 'min-w-24 flex-[1_0_6rem]' : 'min-w-4 flex-[1_0_1rem]'
              )}
              autoComplete="off"
              onChange={(event) => {
                onSearchChange(event.target.value);
                setActiveIndex(0);
                setOpen(true);
              }}
              onClick={() => {
                setActiveIndex(0);
                setOpen(true);
              }}
              onFocus={() => {
                setActiveIndex(0);
                setOpen(true);
              }}
              onKeyDown={handleInputKeyDown}
            />
          </div>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-56 p-1',
          'shadow-lg'
        )}
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) {
            event.preventDefault();
          }
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          aria-multiselectable="true"
          className={cn('overflow-y-auto overscroll-contain', listClassName)}
        >
          {loading ? (
            <FilterOptionsSkeleton />
          ) : availableOptions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            <div className="space-y-1">
              {availableOptions.map((option, index) => {
                const active = index === selectableActiveIndex;

                return (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    id={`${id}-option-${index}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={false}
                    className={cn(
                      'flex w-full min-w-0 cursor-pointer items-center gap-2',
                      'rounded-md px-2 py-1.5 text-left text-sm outline-none',
                      'transition-colors hover:bg-accent',
                      active && 'bg-accent text-accent-foreground'
                    )}
                    onMouseDown={keepInputFocused}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => selectValue(option.value)}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterOptionsSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="space-y-1" aria-label="Загрузка вариантов">
      {Array.from({ length: rows }).map((_, index) => {
        const width = index % 3 === 0 ? 78 : index % 3 === 1 ? 92 : 64;

        return (
          <div
            key={index}
            className="flex items-center gap-2 rounded-md px-2 py-1.5"
          >
            <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
            <div
              className="h-5 animate-pulse rounded bg-muted"
              style={{ width: `${width}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
