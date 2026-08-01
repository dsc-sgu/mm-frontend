import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

type AttemptReviewReviewPanelToggleProps = {
  expanded: boolean;
  controls: string;
  className?: string;
  onToggle: () => void;
};

export function AttemptReviewReviewPanelToggle({
  expanded,
  controls,
  className,
  onToggle,
}: AttemptReviewReviewPanelToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'rounded-full bg-background/95 shadow-lg backdrop-blur',
        'supports-[backdrop-filter]:bg-background/80',
        className
      )}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
    >
      {expanded ? (
        <ChevronDown className="size-4" />
      ) : (
        <ChevronUp className="size-4" />
      )}
      {expanded ? 'Скрыть отзыв' : 'Показать отзыв'}
    </Button>
  );
}
