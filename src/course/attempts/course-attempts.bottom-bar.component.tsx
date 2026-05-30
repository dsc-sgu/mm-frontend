import { Filter, Save, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { selectedLockedAttemptsReason } from './course-attempts.selection';
import type { CourseAttempt } from './course-attempts.types';

export function BottomActionBar({
  attempts,
  selectedAttempts,
  quickGrading,
  hasDraftChanges,
  hasDraftValidationErrors,
  savePending,
  onSelectAll,
  onClearSelection,
  onStartQuickGradingAll,
  onOpenFilters,
  onSaveSelectedMaxGrade,
  onExitQuickGrading,
  onSaveQuickGrades,
}: {
  attempts: CourseAttempt[];
  selectedAttempts: CourseAttempt[];
  quickGrading: boolean;
  hasDraftChanges: boolean;
  hasDraftValidationErrors: boolean;
  feedbackTextVisible: boolean;
  savePending: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onStartQuickGradingAll: () => void;
  onOpenFilters: () => void;
  onSaveSelectedMaxGrade: () => Promise<void>;
  onExitQuickGrading: () => void;
  onFeedbackTextVisibleChange: (visible: boolean) => void;
  onSaveQuickGrades: () => void;
}) {
  const maxGradeReason = selectedLockedAttemptsReason(selectedAttempts);
  const hasSelection = selectedAttempts.length > 0;

  const filtersButton = (
    <Button
      type="button"
      variant="outline"
      onClick={onOpenFilters}
      className="h-10 w-full lg:hidden"
    >
      <Filter className="size-4" /> Фильтры
    </Button>
  );

  return (
    <TooltipProvider>
      <div className="fixed inset-x-3 bottom-2 z-50 mx-auto max-w-7xl rounded-2xl border border-border bg-background/92 p-2 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:inset-x-6 sm:bottom-4 sm:rounded-3xl sm:p-3 lg:left-[max(2rem,calc((100vw-80rem)/2+23.5rem))] lg:right-[max(2rem,calc((100vw-80rem)/2+2rem))]">
        {quickGrading ? (
          <div
            key="quick-grading-actions"
            className="grid min-h-10 gap-3 lg:grid-cols-[minmax(12rem,1fr)_auto] lg:items-center"
          >
            <p className="text-sm font-semibold">Быстрая оценка</p>
            <div className="grid gap-2 min-[480px]:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onExitQuickGrading}
                className="h-10 w-full whitespace-nowrap lg:w-auto"
              >
                Выйти из быстрой оценки
              </Button>
              <Button
                type="button"
                disabled={
                  !hasDraftChanges || hasDraftValidationErrors || savePending
                }
                onClick={onSaveQuickGrades}
                className="h-10 w-full whitespace-nowrap lg:w-auto"
              >
                <Save className="size-4" /> Сохранить
              </Button>
            </div>
          </div>
        ) : hasSelection ? (
          <div
            key="selection-actions"
            className="flex min-h-10 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 text-sm font-semibold">
                Выбрано попыток: {selectedAttempts.length}
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={onClearSelection}
                className="h-10 shrink-0 px-2 sm:px-3 lg:hidden"
              >
                <X className="size-4" /> Очистить
              </Button>
            </div>
            <div className="grid gap-2 min-[480px]:grid-cols-2 lg:flex lg:items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={onClearSelection}
                className="hidden h-10 lg:inline-flex"
              >
                <X className="size-4" /> Очистить выбор
              </Button>
              {maxGradeReason ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      title={maxGradeReason}
                      className="inline-flex w-full lg:w-auto"
                    >
                      <Button type="button" disabled className="h-10 w-full">
                        Поставить максимум
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{maxGradeReason}</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  disabled={savePending}
                  onClick={() => void onSaveSelectedMaxGrade()}
                  className="h-10 w-full lg:w-auto"
                >
                  Поставить максимум
                </Button>
              )}
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
              {filtersButton}
              <Button
                type="button"
                variant="outline"
                disabled={attempts.length === 0}
                onClick={onSelectAll}
                className="h-10 w-full lg:w-auto"
              >
                Выбрать всё
              </Button>
              <Button
                type="button"
                disabled={attempts.length === 0}
                onClick={onStartQuickGradingAll}
                className="h-10 w-full lg:w-auto"
              >
                Быстрая оценка
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
