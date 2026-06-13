import { type KeyboardEvent, useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
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
import {
  type CodeLanguageOption,
  getCodeLanguageBadge,
  getCodeLanguageOptionFromOptions,
  loadCodeLanguageOptions,
} from '@/features/code-block/model/languages';

type CodeLanguageSelectProps = {
  language?: string;
  onChange: (language: string | undefined) => void;
};

function stopEditorHotkeys(event: KeyboardEvent) {
  const isSaveShortcut =
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 's';

  if (!isSaveShortcut) {
    event.stopPropagation();
  }
}

export function CodeLanguageSelect({
  language,
  onChange,
}: CodeLanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CodeLanguageOption[]>([]);
  const selectedLanguage = getCodeLanguageOptionFromOptions(options, language);
  const badge =
    selectedLanguage?.badge ?? getCodeLanguageBadge(language) ?? 'TXT';

  useEffect(() => {
    let isCurrent = true;

    loadCodeLanguageOptions().then((nextOptions) => {
      if (isCurrent) {
        setOptions(nextOptions);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          contentEditable={false}
          className={cn(
            'inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full',
            'bg-black/5 px-2 text-xs font-medium tracking-wide text-slate-600 uppercase',
            'transition-colors hover:bg-black/10 focus-visible:outline-none',
            'dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15'
          )}
          aria-label="Выбрать язык блока кода"
          aria-expanded={open}
          onMouseDown={(event) => event.preventDefault()}
          onKeyDown={stopEditorHotkeys}
        >
          <span>{badge}</span>
          <ChevronsUpDown className="size-3 opacity-60" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0"
        contentEditable={false}
        onKeyDown={stopEditorHotkeys}
      >
        <Command>
          <CommandInput placeholder="Найти язык…" />
          <CommandList>
            <CommandEmpty>Язык не найден.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="plain text txt без подсветки"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'size-4',
                    language ? 'opacity-0' : 'opacity-100'
                  )}
                  aria-hidden="true"
                />
                <span>Без подсветки</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  TXT
                </span>
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.searchValue}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'size-4',
                      selectedLanguage?.value === option.value
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                    aria-hidden="true"
                  />
                  <span>{option.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {option.badge}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
