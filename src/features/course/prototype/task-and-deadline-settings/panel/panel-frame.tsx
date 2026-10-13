// PROTOTYPE (#181): where a side panel sits. Overlay keeps the document's
// width and covers part of it; dock reserves room and the document reflows.
// Phones always get a full-screen sheet.
import { useEffect, type ReactNode } from 'react';

import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

import type { PanelLayout } from './layout';

export function PanelFrame({
  layout,
  expanded = false,
  label,
  onEscape,
  children,
}: {
  layout: PanelLayout;
  expanded?: boolean;
  label: string;
  onEscape: () => void;
  children: ReactNode;
}) {
  const phone = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        event.key !== 'Escape' ||
        (target instanceof HTMLElement &&
          (target.closest(
            'input, textarea, select, [contenteditable="true"]'
          ) ||
            target.closest(
              '[role="dialog"], [data-radix-popper-content-wrapper]'
            )))
      ) {
        return;
      }
      onEscape();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);

  return (
    <aside
      aria-label={label}
      className={cn(
        'fixed z-40 flex flex-col border-border bg-background',
        phone
          ? 'inset-0 z-[60]'
          : expanded
            ? 'top-14 right-0 bottom-0 left-0 border-t shadow-2xl'
            : cn(
                'top-14 right-0 bottom-0 w-[26rem] border-l xl:w-[30rem]',
                layout === 'overlay' ? 'shadow-2xl' : 'z-30'
              )
      )}
    >
      {children}
    </aside>
  );
}
