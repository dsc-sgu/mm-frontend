import { FileCode, FileText, type LucideIcon } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import type { MarkdownFileView } from '@/features/course/features/attempt-review/features/rendered-markdown/model/markdown-file';

type MarkdownViewToggleProps = {
  value: MarkdownFileView;
  onChange: (value: MarkdownFileView) => void;
};

const VIEW_OPTIONS: {
  view: MarkdownFileView;
  label: string;
  Icon: LucideIcon;
}[] = [
  { view: 'source', label: 'Исходный дифф', Icon: FileCode },
  { view: 'rendered', label: 'Отрисованный Markdown', Icon: FileText },
];

export function MarkdownViewToggle({
  value,
  onChange,
}: MarkdownViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Вид Markdown-файла"
      className={cn(
        'inline-grid grid-cols-2 rounded-lg bg-muted/50 p-0.5',
        'text-muted-foreground'
      )}
    >
      {VIEW_OPTIONS.map(({ view, label, Icon }) => {
        const selected = value === view;

        return (
          <button
            key={view}
            type="button"
            className={cn(
              'grid size-8 cursor-pointer place-items-center rounded-md',
              'transition-colors hover:text-foreground',
              'focus-visible:ring-2 focus-visible:ring-ring',
              'focus-visible:outline-none',
              selected && 'bg-background text-foreground shadow-sm'
            )}
            aria-label={label}
            title={label}
            aria-pressed={selected}
            onClick={() => onChange(view)}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
