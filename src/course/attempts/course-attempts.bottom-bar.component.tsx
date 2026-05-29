import { useState } from 'react';
import { Filter, Save, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { scoreDraftMaxScoreError } from './course-attempts.grading';
import { selectedBulkDisableReason } from './course-attempts.selection';
import { CourseAttemptsScoreField } from './course-attempts.score-field.component';
import type { CourseAttempt } from './course-attempts.types';

export function BottomActionBar({
  attempts,
  selectedAttempts,
  quickGrading,
  hasDraftChanges,
  hasDraftValidationErrors,
  feedbackTextVisible,
  savePending,
  onSelectAll,
  onClearSelection,
  onStartQuickGradingAll,
  onOpenFilters,
  onSaveSelectedBulkGrade,
  onExitQuickGrading,
  onFeedbackTextVisibleChange,
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
  onSaveSelectedBulkGrade: (score: number) => Promise<void>;
  onExitQuickGrading: () => void;
  onFeedbackTextVisibleChange: (visible: boolean) => void;
  onSaveQuickGrades: () => void;
}) {
  const [bulkGradePopoverOpen, setBulkGradePopoverOpen] = useState(false);
  const [bulkDraftScore, setBulkDraftScore] = useState('');
  const bulkReason = selectedBulkDisableReason(selectedAttempts);
  const hasSelection = selectedAttempts.length > 0;
  const bulkMaxScore = selectedAttempts[0]?.task.maxScore ?? 0;
  const bulkDraftError = scoreDraftMaxScoreError(bulkMaxScore, bulkDraftScore);

  function setBulkPopoverOpen(open: boolean) {
    if (open) {
      setBulkDraftScore('');
    }

    setBulkGradePopoverOpen(open);
  }

  async function saveSelectedBulkGrade() {
    if (!bulkDraftScore || bulkDraftError) {
      return;
    }

    await onSaveSelectedBulkGrade(Number(bulkDraftScore));
    setBulkPopoverOpen(false);
  }

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
              <label className="flex min-w-0 cursor-pointer items-center gap-2 px-2 text-sm font-medium min-[480px]:col-span-2 sm:px-3 lg:col-span-1">
                <Checkbox
                  checked={feedbackTextVisible}
                  onCheckedChange={(value) =>
                    onFeedbackTextVisibleChange(value === true)
                  }
                />
                <span className="min-w-0 select-none break-words leading-snug">
                  Показать поле текста отзыва
                </span>
              </label>
              {/* TODO(issue #25): define and implement the quick grading feedback textarea design here. */}
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
              {bulkReason ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      title={bulkReason}
                      className="inline-flex w-full lg:w-auto"
                    >
                      <Button type="button" disabled className="h-10 w-full">
                        Оценить
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{bulkReason}</TooltipContent>
                </Tooltip>
              ) : (
                <Popover
                  open={bulkGradePopoverOpen}
                  onOpenChange={setBulkPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button type="button" className="h-10 w-full lg:w-auto">
                      Оценить
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="center"
                    className="w-[calc(100vw-2rem)] max-w-96"
                  >
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">
                          Оценить выбранные попытки
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Выбрано попыток: {selectedAttempts.length}
                        </p>
                      </div>
                      <CourseAttemptsScoreField
                        value={bulkDraftScore}
                        maxScore={bulkMaxScore}
                        changed={bulkDraftScore !== ''}
                        ariaLabel="Общий балл для выбранных попыток"
                        onChange={setBulkDraftScore}
                        className="h-auto flex-wrap"
                      />
                      {/* TODO(issue #25): добавить поле общего текста отзыва для выбранных попыток. */}
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setBulkPopoverOpen(false)}
                        >
                          Отмена
                        </Button>
                        <Button
                          type="button"
                          disabled={
                            !bulkDraftScore ||
                            Boolean(bulkDraftError) ||
                            savePending
                          }
                          onClick={saveSelectedBulkGrade}
                        >
                          <Save className="size-4" /> Сохранить
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full lg:w-auto"
              >
                Продлить дедлайн
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
