import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';

type AttemptReviewMobileDrawerProps = {
  titleId: string;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
};

export function AttemptReviewMobileDrawer({
  titleId,
  title,
  description,
  children,
  onClose,
}: AttemptReviewMobileDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex h-dvh min-h-0 flex-col bg-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b p-4 text-left">
        <div className="min-w-0">
          <h2 id={titleId} className="font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Закрыть: ${title.toLowerCase()}`}
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}
