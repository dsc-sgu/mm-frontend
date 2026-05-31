import { Filter, Save, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';

type BottomActionBarProps =
  | {
      mode: 'quick-grading';
      hasDraftChanges: boolean;
      hasDraftValidationErrors: boolean;
      savePending: boolean;
      onExitQuickGrading: () => void;
      onSaveQuickGrades: () => void | Promise<void>;
    }
  | {
      mode: 'selection';
      selectedCount: number;
      savePending: boolean;
      onClearSelection: () => void;
      onSaveSelectedMaxGrade: () => Promise<void>;
    }
  | {
      mode: 'idle';
      hasAttempts: boolean;
      hasSelectableAttempts: boolean;
      onSelectAll: () => void;
      onStartQuickGradingAll: () => void;
      onOpenFilters: () => void;
    };

export function BottomActionBar(props: BottomActionBarProps) {
  return (
    <div className="fixed inset-x-3 bottom-2 z-50 mx-auto max-w-7xl rounded-2xl border border-border bg-background/92 p-2 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:inset-x-6 sm:bottom-4 sm:rounded-3xl sm:p-3 lg:left-[max(2rem,calc((100vw-80rem)/2+23.5rem))] lg:right-[max(2rem,calc((100vw-80rem)/2+2rem))]">
      {props.mode === 'quick-grading' ? (
        <div
          key="quick-grading-actions"
          className="grid min-h-10 gap-3 lg:grid-cols-[minmax(12rem,1fr)_auto] lg:items-center"
        >
          <div className="grid gap-1">
            <p className="text-sm font-semibold">Быстрая оценка</p>
            {props.hasDraftValidationErrors ? (
              <p className="text-sm font-medium text-destructive">
                Исправьте ошибки в полях оценки.
              </p>
            ) : null}
          </div>
          <div className="grid gap-2 min-[480px]:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={props.onExitQuickGrading}
              className="h-10 w-full whitespace-nowrap lg:w-auto"
            >
              Выйти из быстрой оценки
            </Button>
            <Button
              type="button"
              disabled={
                !props.hasDraftChanges ||
                props.hasDraftValidationErrors ||
                props.savePending
              }
              onClick={props.onSaveQuickGrades}
              className="h-10 w-full whitespace-nowrap lg:w-auto"
            >
              <Save className="size-4" /> Сохранить
            </Button>
          </div>
        </div>
      ) : props.mode === 'selection' ? (
        <div
          key="selection-actions"
          className="flex min-h-10 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold">
              Выбрано попыток: {props.selectedCount}
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={props.onClearSelection}
              className="h-10 shrink-0 px-2 sm:px-3 lg:hidden"
            >
              <X className="size-4" /> Очистить
            </Button>
          </div>
          <div className="grid gap-2 min-[480px]:grid-cols-2 lg:flex lg:items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={props.onClearSelection}
              className="hidden h-10 lg:inline-flex"
            >
              <X className="size-4" /> Очистить выбор
            </Button>
            <Button
              type="button"
              disabled={props.savePending}
              onClick={() => void props.onSaveSelectedMaxGrade()}
              className="h-10 w-full lg:w-auto"
            >
              Поставить максимум
            </Button>
          </div>
        </div>
      ) : (
        <div
          key="idle-actions"
          className="flex min-h-10 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          <p className="min-w-0 break-words text-sm text-muted-foreground">
            Выберите отдельные попытки или запустите оценку всех видимых.
          </p>
          <div className="grid gap-2 min-[496px]:grid-cols-3 lg:flex lg:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={props.onOpenFilters}
              className="h-10 w-full lg:hidden"
            >
              <Filter className="size-4" /> Фильтры
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!props.hasSelectableAttempts}
              onClick={props.onSelectAll}
              className="h-10 w-full lg:w-auto"
            >
              Выбрать всё
            </Button>
            <Button
              type="button"
              disabled={!props.hasAttempts}
              onClick={props.onStartQuickGradingAll}
              className="h-10 w-full lg:w-auto"
            >
              Быстрая оценка
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
