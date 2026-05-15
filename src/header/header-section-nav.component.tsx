import { Link } from '@tanstack/react-router';

import { cn } from '@/shadcn/lib/utils';
import type { HeaderNavItem } from './header.types';

type HeaderSectionNavProps = {
  items: HeaderNavItem[];
};

export function HeaderSectionNav({ items }: HeaderSectionNavProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border/60">
      <nav
        aria-label="Разделы страницы"
        className="flex h-11 items-end gap-1 overflow-x-auto px-3 md:px-4"
      >
        {items.map((item) => (
          <Link
            key={`${item.to}-${item.label}`}
            to={item.to as never}
            params={item.params as never}
            activeOptions={{ exact: item.exact }}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-2 rounded-t-md px-3 text-sm font-medium',
              'text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            activeProps={{
              className:
                'text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary',
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
