// PROTOTYPE (#121): minimal recovery surface from #114, only to check that the
// entered Overall Feedback travels into recovery entries together with the Grade.
import { Copy, Download, ExternalLink, Trash2 } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import {
  formatRecoveryEntry,
  type RecoveryEntry,
} from '@/features/course/features/attempts/prototype/quick-grading-feedback/session';

export function RecoveryDialog({
  open,
  entries,
  savedCount,
  onOpenChange,
  onDismiss,
}: {
  open: boolean;
  entries: readonly RecoveryEntry[];
  savedCount: number;
  onOpenChange: (open: boolean) => void;
  onDismiss: (attemptId: string) => void;
}) {
  const allText = entries.map(formatRecoveryEntry).join('\n\n');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Опубликовано не всё</DialogTitle>
          <DialogDescription>
            Опубликовано за сессию: {savedCount}. Не опубликовано:{' '}
            {entries.length}. Введённые балл и отзыв сохранены здесь.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid max-h-[55vh] gap-2 overflow-y-auto">
          {entries.map((entry) => (
            <li
              key={entry.attemptId}
              className="rounded-xl border border-border p-3 text-sm"
            >
              <pre className="font-sans text-sm whitespace-pre-wrap">
                {formatRecoveryEntry(entry)}
              </pre>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled>
                  <ExternalLink /> Individual review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      formatRecoveryEntry(entry)
                    )
                  }
                >
                  <Copy /> Копировать
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(entry.attemptId)}
                >
                  <Trash2 /> Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(allText)}
          >
            <Copy /> Копировать всё
          </Button>
          <Button type="button" variant="outline" disabled>
            <Download /> TXT
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
