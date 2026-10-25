// PROTOTYPE (#121): leaving quick grading with unsaved values. Replaces the
// native confirm, whose default button is "OK": in this mode Enter means
// "next grade", so a reflexive Esc → Enter would silently drop the session.
// Here the focused, default action is to stay.
import { Button } from '@/shadcn/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';

export function ExitDialog({
  open,
  unsavedCount,
  recoveryCount,
  modKeyLabel,
  onOpenChange,
  onExit,
}: {
  open: boolean;
  unsavedCount: number;
  recoveryCount: number;
  modKeyLabel: string;
  onOpenChange: (open: boolean) => void;
  onExit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Выйти из быстрой оценки?</DialogTitle>
          <DialogDescription>
            {unsavedCount > 0 ? `Не сохранено: ${unsavedCount}. ` : null}
            {recoveryCount > 0
              ? `Не опубликовано после конфликта: ${recoveryCount}. `
              : null}
            После выхода введённые баллы и отзывы пропадут.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={onExit}
          >
            Выйти без сохранения
          </Button>
          <Button type="button" autoFocus onClick={() => onOpenChange(false)}>
            Остаться
            <KbdGroup>
              <Kbd>Esc</Kbd>
            </KbdGroup>
          </Button>
        </DialogFooter>
        <p className="text-xs text-muted-foreground">
          Чтобы сохранить, останьтесь и нажмите{' '}
          <KbdGroup>
            <Kbd>{modKeyLabel}</Kbd>
            <Kbd>S</Kbd>
          </KbdGroup>
        </p>
      </DialogContent>
    </Dialog>
  );
}
