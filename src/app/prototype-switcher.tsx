// PROTOTYPE: throwaway variant switcher for UI prototypes. Lives only on
// prototype/* branches and never renders in production builds.
import { useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';

export type PrototypeVariant = {
  key: string;
  name: string;
};

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
  children,
}: {
  variants: readonly PrototypeVariant[];
  current: string;
  onChange: (key: string) => void;
  children?: ReactNode;
}) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current)
  );
  const currentVariant = variants[index];

  useEffect(() => {
    function step(delta: number) {
      const next =
        variants[(index + delta + variants.length) % variants.length];

      if (next) {
        onChange(next.key);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.closest('input, textarea, select, [contenteditable]') ||
          target.isContentEditable ||
          target.closest('[role="dialog"], [role="slider"]'))
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
  }, [index, onChange, variants]);

  if (!import.meta.env.DEV || !currentVariant) {
    return null;
  }

  return (
    <div
      data-prototype-switcher
      className={cn(
        'fixed bottom-3 left-1/2 z-[100] -translate-x-1/2',
        'flex max-w-[calc(100vw-1rem)] items-center gap-1 rounded-full',
        'bg-zinc-950 p-1 text-sm text-zinc-50 shadow-2xl ring-2 ring-fuchsia-500',
        'dark:bg-zinc-50 dark:text-zinc-950'
      )}
    >
      <button
        type="button"
        aria-label="Предыдущий вариант"
        onClick={() =>
          onChange(
            variants[(index - 1 + variants.length) % variants.length]!.key
          )
        }
        className="grid size-8 place-items-center rounded-full hover:bg-white/15"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-0 truncate px-2 font-semibold">
        {currentVariant.key} · {currentVariant.name}
      </span>
      <button
        type="button"
        aria-label="Следующий вариант"
        onClick={() => onChange(variants[(index + 1) % variants.length]!.key)}
        className="grid size-8 place-items-center rounded-full hover:bg-white/15"
      >
        <ChevronRight className="size-4" />
      </button>
      {children ? (
        <span className="flex items-center gap-1 border-l border-white/20 pl-1">
          {children}
        </span>
      ) : null}
    </div>
  );
}
