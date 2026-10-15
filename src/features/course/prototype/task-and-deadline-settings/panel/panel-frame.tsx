// PROTOTYPE (#181): where a side panel sits. Overlay keeps the document's
// width and covers part of it; dock reserves room and the document reflows.
// Phones always get a full-screen sheet.
import { useEffect, useState, type ReactNode } from 'react';

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
  // The app header scrolls away; the panel takes its place, as in Linear.
  const [top, setTop] = useState(() => headerOffset());

  useEffect(() => {
    const update = () => setTop(headerOffset());
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

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
      style={phone ? undefined : { top }}
      className={cn(
        'fixed z-40 flex flex-col border-border bg-background',
        placementClasses({ phone, expanded, layout })
      )}
    >
      {children}
    </aside>
  );
}

const HEADER_HEIGHT = 56;

function headerOffset() {
  return Math.max(0, HEADER_HEIGHT - window.scrollY);
}

function placementClasses({
  phone,
  expanded,
  layout,
}: {
  phone: boolean;
  expanded: boolean;
  layout: PanelLayout;
}) {
  if (phone) {
    return 'inset-0 z-[60]';
  }
  if (expanded) {
    return 'right-0 bottom-0 left-0 border-t shadow-2xl';
  }

  return cn(
    'right-0 bottom-0 w-[26rem] border-l xl:w-[30rem]',
    layout === 'overlay' ? 'shadow-2xl' : 'z-30'
  );
}
