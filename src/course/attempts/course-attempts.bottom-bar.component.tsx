import { Save, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { selectedBulkDisableReason } from './course-attempts.selection';
import type { CourseAttempt } from './course-attempts.types';

export function BottomActionBar({
  attempts,
  selectedAttempts,
  quickGrading,
  hasDraftChanges,
  feedbackTextVisible,
  savePending,
  onSelectAll,
  onClearSelection,
  onStartQuickGradingAll,
  onStartQuickGradingSelection,
  onExitQuickGrading,
  onFeedbackTextVisibleChange,
  onSaveQuickGrades,
}: {
  attempts: CourseAttempt[];
  selectedAttempts: CourseAttempt[];
  quickGrading: boolean;
  hasDraftChanges: boolean;
  feedbackTextVisible: boolean;
  savePending: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onStartQuickGradingAll: () => void;
  onStartQuickGradingSelection: () => void;
  onExitQuickGrading: () => void;
  onFeedbackTextVisibleChange: (visible: boolean) => void;
  onSaveQuickGrades: () => void;
}) {
  const bulkReason = selectedBulkDisableReason(selectedAttempts);
  const hasSelection = selectedAttempts.length > 0;

  return (
    <TooltipProvider>
      <div className="sticky bottom-4 z-10 mt-6 rounded-3xl border border-border bg-background/92 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/75">
        {quickGrading ? (
          <div
            key="quick-grading-actions"
            className="grid min-h-10 gap-3 lg:grid-cols-[minmax(12rem,1fr)_auto] lg:items-center"
          >
            <p className="text-sm font-semibold">Быстрая оценка</p>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <label className="flex min-w-0 cursor-pointer items-center gap-2 px-3 text-sm font-medium">
                <Checkbox
                  checked={feedbackTextVisible}
                  onCheckedChange={(value) =>
                    onFeedbackTextVisibleChange(value === true)
                  }
                />
                <span className="whitespace-nowrap select-none">
                  Показать поле текста отзыва
                </span>
              </label>
              {/* TODO(issue #25): define and implement the quick grading feedback textarea design here. */}
              <Button
                type="button"
                variant="outline"
                onClick={onExitQuickGrading}
                className="h-10 whitespace-nowrap"
              >
                Выйти из быстрой оценки
              </Button>
              <Button
                type="button"
                disabled={!hasDraftChanges || savePending}
                onClick={onSaveQuickGrades}
                className="h-10 whitespace-nowrap"
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
            <p className="text-sm font-semibold">
              Выбрано попыток: {selectedAttempts.length}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={onClearSelection}
                className="h-10"
              >
                <X className="size-4" /> Очистить выбор
              </Button>
              <Tooltip open={bulkReason ? undefined : false}>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={bulkReason ? 0 : -1}
                    title={bulkReason ?? undefined}
                    className="inline-flex"
                  >
                    <Button
                      type="button"
                      disabled={Boolean(bulkReason)}
                      onClick={onStartQuickGradingSelection}
                      className="h-10"
                    >
                      Оценить
                    </Button>
                  </span>
                </TooltipTrigger>
                {bulkReason ? (
                  <TooltipContent>{bulkReason}</TooltipContent>
                ) : null}
              </Tooltip>
              <Button type="button" variant="outline" className="h-10">
                Продлить дедлайн
              </Button>
            </div>
          </div>
        ) : (
          <div
            key="idle-actions"
            className="flex min-h-10 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <p className="text-sm text-muted-foreground">
              Выберите отдельные попытки или запустите оценку всех видимых.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={attempts.length === 0}
                onClick={onSelectAll}
                className="h-10"
              >
                Выбрать всё
              </Button>
              <Button
                type="button"
                disabled={attempts.length === 0}
                onClick={onStartQuickGradingAll}
                className="h-10"
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
