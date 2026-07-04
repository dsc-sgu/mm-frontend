import { Loader2 } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import { cn } from '@/shadcn/lib/utils';
import { getModKeyLabel } from '@/features/course/features/page-edit/model/platform';

export function CoursePageEditApplyBar({
  isDirty,
  canApply,
  isSaving,
  oldSlug,
  newSlug,
  onReset,
  onApply,
}: {
  isDirty: boolean;
  canApply: boolean;
  isSaving: boolean;
  oldSlug: string;
  newSlug: string;
  onReset: () => void;
  onApply: () => void;
}) {
  if (!isDirty) {
    return null;
  }

  const slugChanged = oldSlug !== newSlug;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-6xl px-3 pb-3 sm:px-6 sm:py-6 lg:px-8">
      <div
        className={cn(
          'flex w-full flex-col gap-3 rounded-2xl border',
          'border-border bg-card/95 p-3 text-card-foreground shadow-2xl',
          'backdrop-blur supports-[backdrop-filter]:bg-card/85',
          'sm:flex-row sm:items-center sm:justify-between sm:p-4'
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              className="size-2 rounded-full bg-primary"
              aria-hidden="true"
            />
            Есть несохранённые изменения
          </div>
          {slugChanged && (
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              slug: /{oldSlug} → /{newSlug}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onReset}
          >
            Сбросить
          </Button>
          <Button
            type="button"
            disabled={!canApply || isSaving}
            onClick={onApply}
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Применить
            <KbdGroup aria-label="Горячая клавиша">
              <Kbd>{getModKeyLabel()}</Kbd>
              <Kbd>S</Kbd>
            </KbdGroup>
          </Button>
        </div>
      </div>
    </div>
  );
}
