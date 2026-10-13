// PROTOTYPE (#181): selection bar for several Tasks, after ClickUp / folk.
import { CalendarArrowUp, X } from 'lucide-react';

export function BulkBar({
  count,
  onClear,
  onShift,
}: {
  count: number;
  onClear: () => void;
  onShift: () => void;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-lg bg-foreground p-1 text-sm text-background shadow-lg">
      <span className="px-2">Выбрано Task: {count}</span>
      <button
        type="button"
        aria-label="Снять выбор"
        onClick={onClear}
        className="grid size-7 place-items-center rounded-md hover:bg-background/15"
      >
        <X className="size-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-background/25" />
      <button
        type="button"
        onClick={onShift}
        className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 hover:bg-background/15"
      >
        <CalendarArrowUp className="size-4" />
        Сдвинуть дедлайны
      </button>
    </div>
  );
}
