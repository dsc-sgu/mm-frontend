import { ChevronRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { cn } from '@/shadcn/lib/utils';
import type { HeaderBreadcrumbItem } from './header.types';

type HeaderBreadcrumbsProps = {
  items: HeaderBreadcrumbItem[];
  className?: string;
};

export function HeaderBreadcrumbs({
  items,
  className,
}: HeaderBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Навигационная цепочка"
      className={cn('min-w-0 flex-1 overflow-hidden', className)}
    >
      <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return <BreadcrumbItemLi item={item} index={index} isLast={isLast} />;
        })}
      </ol>
    </nav>
  );
}

function BreadcrumbItemLi({
  item,
  index,
  isLast,
}: {
  item: HeaderBreadcrumbItem;
  index: number;
  isLast: boolean;
}) {
  return (
    <li
      key={`${item.label}-${index}`}
      className="flex min-w-0 items-center gap-1"
    >
      {index > 0 && (
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground/55"
        />
      )}

      <BreadcrumbItemText item={item} isLast={isLast} />
    </li>
  );
}

function BreadcrumbItemText({
  item,
  isLast,
}: {
  item: HeaderBreadcrumbItem;
  isLast: boolean;
}) {
  if (item.to && !isLast) {
    return (
      <Link
        to={item.to as never}
        params={item.params as never}
        className={cn(
          'truncate rounded-sm px-1 py-0.5 underline-offset-4 transition-colors',
          'hover:text-foreground hover:underline',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        {item.label}
      </Link>
    );
  } else {
    return (
      <span
        aria-current={isLast ? 'page' : undefined}
        className={cn(
          'truncate px-1 py-0.5',
          isLast && 'font-medium text-foreground'
        )}
      >
        {item.label}
      </span>
    );
  }
}
