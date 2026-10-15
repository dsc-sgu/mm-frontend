// PROTOTYPE: steps through a prototype's variants with the arrows in the
// prototype bar or with ← / → outside text fields and dialogs.
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PrototypeVariant = {
  key: string;
  name: string;
};

export function VariantStepper({
  variants,
  current,
  onChange,
}: {
  variants: readonly PrototypeVariant[];
  /** Undefined when the current page shows none of the variants. */
  current: string | undefined;
  onChange: (key: string) => void;
}) {
  const index = variants.findIndex((variant) => variant.key === current);
  const currentVariant = variants[index];

  function step(delta: number) {
    // From a page without a variant, → opens the first one and ← the last.
    const from = index === -1 && delta > 0 ? -1 : Math.max(index, 0);
    const next = variants[(from + delta + variants.length) % variants.length];

    if (next) {
      onChange(next.key);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.closest('input, textarea, select, [contenteditable]') ||
          target.isContentEditable ||
          target.closest('[role="dialog"], [role="slider"], [role="menu"]'))
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        step(-1);
      }

      if (event.key === 'ArrowRight') {
        step(1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <span className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label="Предыдущий вариант"
        onClick={() => step(-1)}
        className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/15"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-0 truncate px-1 font-semibold">
        {currentVariant
          ? `${currentVariant.key} · ${currentVariant.name}`
          : 'Вариант не открыт'}
      </span>
      <button
        type="button"
        aria-label="Следующий вариант"
        onClick={() => step(1)}
        className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/15"
      >
        <ChevronRight className="size-4" />
      </button>
    </span>
  );
}
