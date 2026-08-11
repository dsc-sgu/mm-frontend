import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Check, Search } from 'lucide-react';

import { Input } from '@/shadcn/components/ui/input';
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
  selectedValues,
  loading,
  listClassName,
  onSearchChange,
  onSelectedValuesChange,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = `${id}-listbox`;

  const selectableActiveIndex =
    !loading && options.length > 0
      ? Math.min(Math.max(activeIndex, 0), options.length - 1)
      : -1;

  useEffect(() => {
    if (!open || selectableActiveIndex < 0) {
      return;
    }

    optionRefs.current[selectableActiveIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [open, selectableActiveIndex]);

  function toggleValue(value: string) {
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedValues, value].sort((first, second) =>
          first.localeCompare(second)
        );

    onSelectedValuesChange(nextValues);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }

      if (options.length === 0 || loading) {
        return;
      }

      setActiveIndex((currentIndex) => {
        if (currentIndex < 0) {
          return 0;
        }

        const direction = event.key === 'ArrowDown' ? 1 : -1;
        return (currentIndex + direction + options.length) % options.length;
      });
      return;
    }

    if (event.key === 'Enter' && open && selectableActiveIndex >= 0) {
      const activeOption = options[selectableActiveIndex];

      if (activeOption) {
        event.preventDefault();
        toggleValue(activeOption.value);
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
        <div className="relative mt-2">
          <Search
            className={cn(
              'pointer-events-none absolute top-1/2 left-3 size-4',
              '-translate-y-1/2 text-muted-foreground'
            )}
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            id={id}
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
            placeholder={placeholder}
            className="pl-9"
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
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-56 p-1',
          'shadow-lg'
        )}
        onInteractOutside={(event) => {
          if (inputRef.current?.contains(event.target as Node)) {
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
          ) : options.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            <div className="space-y-1">
              {options.map((option, index) => {
                const selected = selectedValues.includes(option.value);
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
                    aria-selected={selected}
                    className={cn(
                      'flex w-full min-w-0 cursor-pointer items-center gap-2',
                      'rounded-md px-2 py-1.5 text-left text-sm outline-none',
                      'transition-colors hover:bg-accent',
                      active && 'bg-accent text-accent-foreground'
                    )}
                    onMouseDown={keepInputFocused}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => toggleValue(option.value)}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center',
                        'rounded-[4px] border border-input shadow-xs',
                        selected &&
                          'border-primary bg-primary text-primary-foreground'
                      )}
                      aria-hidden="true"
                    >
                      {selected ? <Check className="size-3.5" /> : null}
                    </span>
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
