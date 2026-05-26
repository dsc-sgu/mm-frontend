import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  Filter,
  LockKeyhole,
  Save,
  Search,
  X,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { Input } from '@/shadcn/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { cn } from '@/shadcn/lib/utils';
import {
  areCourseAttemptsFiltersEqual,
  normalizeCourseAttemptsFilters,
} from './course-attempts.filters';
import {
  useCourseAttemptsQuery,
  useSaveQuickGradesMutation,
} from './course-attempts.queries';
import type {
  CourseAttempt,
  CourseAttemptGradedFilter,
  CourseAttemptsFilters,
} from './course-attempts.types';

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const GRADED_FILTER_OPTIONS: Array<{
  value: CourseAttemptGradedFilter;
  label: string;
}> = [
  { value: 'any', label: 'Неважно' },
  { value: 'no', label: 'Нет' },
  { value: 'yes', label: 'Да' },
];

const EMPTY_ATTEMPTS: CourseAttempt[] = [];
const EMPTY_TASKS: CourseAttempt['task'][] = [];
const EMPTY_STUDENTS: CourseAttempt['student'][] = [];

interface CourseAttemptsPageProps {
  courseSlug: string;
  appliedFilters: CourseAttemptsFilters;
  onApplyFilters: (filters: CourseAttemptsFilters) => void;
}

function formatDateTime(value: string): string {
  return DATE_TIME_FORMAT.format(new Date(value));
}

function getTimingLabel(attempt: CourseAttempt): {
  label: string;
  className: string;
} {
  const late = new Date(attempt.submittedAt) > new Date(attempt.deadlineAt);

  return late
    ? {
        label: `после дедлайна ${formatDateTime(attempt.deadlineAt)}`,
        className: 'text-amber-700 dark:text-amber-300',
      }
    : {
        label: `до дедлайна ${formatDateTime(attempt.deadlineAt)}`,
        className: 'text-emerald-700 dark:text-emerald-300',
      };
}

function getGroupLabel(attempt: CourseAttempt): string {
  return [
    attempt.student.group,
    attempt.student.subgroup ? `${attempt.student.subgroup} подгр.` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function getAttemptDiffHref(
  courseSlug: string,
  attempt: CourseAttempt
): string {
  return `/courses/${courseSlug}/tasks/${attempt.task.id}/attempts/${attempt.student.username}/${attempt.attemptNumber}`;
}

function getAttemptReviewHref(
  courseSlug: string,
  attempt: CourseAttempt
): string {
  return `${getAttemptDiffHref(courseSlug, attempt)}/review`;
}

function toggleToken(tokens: string[], token: string): string[] {
  return tokens.includes(token)
    ? tokens.filter((item) => item !== token)
    : [...tokens, token].sort((a, b) => a.localeCompare(b));
}

function selectedBulkDisableReason(attempts: CourseAttempt[]): string | null {
  const locked = attempts.filter((attempt) => attempt.reviewLock);
  if (locked.length > 0) {
    return `Уже взяты на проверку: ${locked
      .map((attempt) => `${attempt.task.title} — ${attempt.student.fullName}`)
      .join('; ')}`;
  }

  const maxScores = new Set(attempts.map((attempt) => attempt.task.maxScore));
  if (maxScores.size > 1) {
    return 'Нельзя оценивать вместе попытки с разным максимальным баллом.';
  }

  return null;
}

function scoreValue(attempt: CourseAttempt): string {
  return attempt.grade ? String(attempt.grade.score) : '';
}

function scoreDraftChanged(
  attempt: CourseAttempt,
  draft: string | undefined
): boolean {
  return (draft ?? '') !== scoreValue(attempt);
}

function FilterOption({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => {
          if (value !== 'indeterminate') {
            onCheckedChange();
          }
        }}
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

function AttemptsFilterSidebar({
  appliedFilters,
  draftFilters,
  attemptsCount,
  tasks,
  students,
  onDraftFiltersChange,
  onApplyFilters,
}: {
  appliedFilters: CourseAttemptsFilters;
  draftFilters: CourseAttemptsFilters;
  attemptsCount: number;
  tasks: CourseAttempt['task'][];
  students: CourseAttempt['student'][];
  onDraftFiltersChange: (filters: CourseAttemptsFilters) => void;
  onApplyFilters: () => void;
}) {
  const [taskSearch, setTaskSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const applyDisabled = areCourseAttemptsFiltersEqual(
    draftFilters,
    appliedFilters
  );
  const visibleTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(taskSearch.toLowerCase().trim())
  );
  const visibleStudents = students.filter((student) =>
    `${student.fullName} ${student.username}`
      .toLowerCase()
      .includes(studentSearch.toLowerCase().trim())
  );

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm lg:max-h-[calc(100dvh-2rem)] lg:w-80 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Filter className="size-4" /> Фильтры
            </p>
            <h2 className="mt-1 text-xl font-semibold">Попытки</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
            {attemptsCount}
          </span>
        </div>

        <div className="mt-5 space-y-6">
          <section>
            <h3 className="text-sm font-semibold">Задания</h3>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={taskSearch}
                onChange={(event) => setTaskSearch(event.target.value)}
                placeholder="Найти задание"
                className="pl-9"
              />
            </div>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
              {visibleTasks.map((task) => (
                <FilterOption
                  key={task.id}
                  id={`task-filter-${task.id}`}
                  label={`${task.title} · ${task.maxScore} б.`}
                  checked={draftFilters.tasks.includes(task.id)}
                  onCheckedChange={() =>
                    onDraftFiltersChange({
                      ...draftFilters,
                      tasks: toggleToken(draftFilters.tasks, task.id),
                    })
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Студенты</h3>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="ФИО или username"
                className="pl-9"
              />
            </div>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
              {visibleStudents.map((student) => (
                <FilterOption
                  key={student.username}
                  id={`student-filter-${student.username}`}
                  label={`${student.fullName} · ${student.group}`}
                  checked={draftFilters.students.includes(student.username)}
                  onCheckedChange={() =>
                    onDraftFiltersChange({
                      ...draftFilters,
                      students: toggleToken(
                        draftFilters.students,
                        student.username
                      ),
                    })
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Оценена</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {GRADED_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onDraftFiltersChange({
                      ...draftFilters,
                      graded: option.value,
                    })
                  }
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    draftFilters.graded === option.value
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border-border bg-background'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <Button
          type="button"
          className="mt-6 w-full"
          disabled={applyDisabled}
          onClick={onApplyFilters}
        >
          Применить
        </Button>
      </div>
    </aside>
  );
}

function AttemptMetadata({ attempt }: { attempt: CourseAttempt }) {
  const timing = getTimingLabel(attempt);

  return (
    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
      <span>{attempt.student.fullName}</span>
      <span>{getGroupLabel(attempt)}</span>
      <span>Сдано {formatDateTime(attempt.submittedAt)}</span>
      <span className={timing.className}>{timing.label}</span>
    </div>
  );
}

function AttemptCard({
  attempt,
  courseSlug,
  selected,
  onSelectedChange,
}: {
  attempt: CourseAttempt;
  courseSlug: string;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
}) {
  return (
    <article
      className={cn(
        'rounded-3xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        selected ? 'border-primary ring-2 ring-primary/15' : 'border-border'
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelectedChange(value === true)}
            aria-label={`Выбрать попытку ${attempt.task.title}`}
            className="mt-1"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                Попытка #{attempt.attemptNumber}
              </span>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-200">
                {attempt.task.maxScore} б. максимум
              </span>
              {attempt.reviewLock ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                  <LockKeyhole className="size-3" /> На проверке
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">
              {attempt.task.title}
            </h3>
          </div>
        </div>

        <Button asChild variant={selected ? 'outline' : 'default'}>
          <a
            href={
              selected
                ? getAttemptDiffHref(courseSlug, attempt)
                : getAttemptReviewHref(courseSlug, attempt)
            }
          >
            {selected ? (
              <Eye className="size-4" />
            ) : (
              <FileCheck2 className="size-4" />
            )}
            {selected ? 'Посмотреть' : 'Оценить'}
          </a>
        </Button>
      </div>

      <AttemptMetadata attempt={attempt} />

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          <ArrowUp className="size-4" /> +{attempt.diff.addedLines}
        </span>
        <span className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-200">
          <ArrowDown className="size-4" /> −{attempt.diff.deletedLines}
        </span>
        {attempt.grade ? (
          <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 font-medium text-foreground">
            <CheckCircle2 className="size-4" /> {attempt.grade.score}/
            {attempt.grade.maxScore}, {attempt.grade.gradedBy},{' '}
            {formatDateTime(attempt.grade.gradedAt)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 font-medium text-muted-foreground">
            <Clock3 className="size-4" /> Без оценки
          </span>
        )}
      </div>
    </article>
  );
}

function QuickGradingCard({
  attempt,
  draftScore,
  onDraftScoreChange,
}: {
  attempt: CourseAttempt;
  draftScore: string;
  onDraftScoreChange: (score: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
              Попытка #{attempt.attemptNumber}
            </span>
            {attempt.reviewLock ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <LockKeyhole className="size-3" />{' '}
                {attempt.reviewLock.teacherName}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">
            {attempt.task.title}
          </h3>
        </div>
        <label className="w-full sm:w-48">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Балл из {attempt.task.maxScore}
          </span>
          <Input
            type="number"
            min={0}
            max={attempt.task.maxScore}
            step={1}
            value={draftScore}
            disabled={Boolean(attempt.reviewLock)}
            onChange={(event) => onDraftScoreChange(event.target.value)}
            placeholder="—"
            className="mt-1 text-lg font-semibold"
          />
        </label>
      </div>

      <AttemptMetadata attempt={attempt} />

      {attempt.reviewLock ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-100">
          Оценка недоступна: попытку проверяет {attempt.reviewLock.teacherName}.
        </p>
      ) : null}
    </article>
  );
}

function BottomActionBar({
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold">Быстрая оценка</p>
              <p className="text-sm text-muted-foreground">
                Изменения сохраняются в мок-данных без сброса фильтров.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm">
                <Checkbox
                  checked={feedbackTextVisible}
                  onCheckedChange={(value) =>
                    onFeedbackTextVisibleChange(value === true)
                  }
                />
                Показать поле текста отзыва
              </label>
              {/* TODO(issue #25): define and implement the quick grading feedback textarea design here. */}
              <Button
                type="button"
                variant="outline"
                onClick={onExitQuickGrading}
              >
                Выйти из быстрой оценки
              </Button>
              <Button
                type="button"
                disabled={!hasDraftChanges || savePending}
                onClick={onSaveQuickGrades}
              >
                <Save className="size-4" /> Сохранить
              </Button>
            </div>
          </div>
        ) : hasSelection ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm font-semibold">
              Выбрано попыток: {selectedAttempts.length}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" variant="ghost" onClick={onClearSelection}>
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
                    >
                      Оценить
                    </Button>
                  </span>
                </TooltipTrigger>
                {bulkReason ? (
                  <TooltipContent>{bulkReason}</TooltipContent>
                ) : null}
              </Tooltip>
              <Button type="button" variant="outline">
                Продлить дедлайн
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-muted-foreground">
              Выберите отдельные попытки или запустите оценку всех видимых.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={attempts.length === 0}
                onClick={onSelectAll}
              >
                Выбрать всё
              </Button>
              <Button
                type="button"
                disabled={attempts.length === 0}
                onClick={onStartQuickGradingAll}
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

export function CourseAttemptsPage({
  courseSlug,
  appliedFilters,
  onApplyFilters,
}: CourseAttemptsPageProps) {
  const normalizedAppliedFilters = useMemo(
    () => normalizeCourseAttemptsFilters(appliedFilters),
    [appliedFilters]
  );
  const [draftFilters, setDraftFilters] = useState(normalizedAppliedFilters);
  const [selectedAttemptIds, setSelectedAttemptIds] = useState<string[]>([]);
  const [quickGradingAttemptIds, setQuickGradingAttemptIds] = useState<
    string[]
  >([]);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [feedbackTextVisible, setFeedbackTextVisible] = useState(false);

  const attemptsQuery = useCourseAttemptsQuery({
    courseSlug,
    filters: normalizedAppliedFilters,
  });
  const saveQuickGradesMutation = useSaveQuickGradesMutation();

  const attempts = attemptsQuery.data?.attempts ?? EMPTY_ATTEMPTS;
  const tasks = attemptsQuery.data?.tasks ?? EMPTY_TASKS;
  const students = attemptsQuery.data?.students ?? EMPTY_STUDENTS;
  const selectedAttempts = attempts.filter((attempt) =>
    selectedAttemptIds.includes(attempt.id)
  );
  const quickGradingAttempts = attempts.filter((attempt) =>
    quickGradingAttemptIds.includes(attempt.id)
  );
  const isQuickGrading = quickGradingAttemptIds.length > 0;
  const hasDraftChanges = quickGradingAttempts.some((attempt) =>
    scoreDraftChanged(attempt, draftScores[attempt.id])
  );

  useEffect(() => {
    setDraftFilters(normalizedAppliedFilters);
  }, [normalizedAppliedFilters]);

  useEffect(() => {
    const visibleIds = new Set(attempts.map((attempt) => attempt.id));
    setSelectedAttemptIds((current) =>
      current.filter((attemptId) => visibleIds.has(attemptId))
    );
    setQuickGradingAttemptIds((current) =>
      current.filter((attemptId) => visibleIds.has(attemptId))
    );
  }, [attempts]);

  function startQuickGrading(targetAttempts: CourseAttempt[]) {
    setQuickGradingAttemptIds(targetAttempts.map((attempt) => attempt.id));
    setDraftScores(
      Object.fromEntries(
        targetAttempts.map((attempt) => [attempt.id, scoreValue(attempt)])
      )
    );
    setSelectedAttemptIds([]);
    setFeedbackTextVisible(false);
  }

  function exitQuickGrading() {
    setQuickGradingAttemptIds([]);
    setDraftScores({});
    setFeedbackTextVisible(false);
  }

  async function saveQuickGrades() {
    const updates = quickGradingAttempts
      .filter(
        (attempt) =>
          !attempt.reviewLock &&
          scoreDraftChanged(attempt, draftScores[attempt.id])
      )
      .map((attempt) => ({
        attemptId: attempt.id,
        score: Math.min(
          attempt.task.maxScore,
          Math.max(0, Number(draftScores[attempt.id] || 0))
        ),
      }));

    if (updates.length === 0) {
      return;
    }

    await saveQuickGradesMutation.mutateAsync({
      courseSlug,
      updates,
      clearFeedbackText: !feedbackTextVisible,
    });
    exitQuickGrading();
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <AttemptsFilterSidebar
          appliedFilters={normalizedAppliedFilters}
          draftFilters={draftFilters}
          attemptsCount={attempts.length}
          tasks={tasks}
          students={students}
          onDraftFiltersChange={(filters) =>
            setDraftFilters(normalizeCourseAttemptsFilters(filters))
          }
          onApplyFilters={() => onApplyFilters(draftFilters)}
        />

        <section className="min-w-0">
          {attemptsQuery.isPending ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-3xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : attempts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
              <h2 className="text-xl font-semibold">Попытки не найдены</h2>
              <p className="mt-2 text-muted-foreground">
                Измените фильтры в боковой панели и нажмите «Применить».
              </p>
            </div>
          ) : isQuickGrading ? (
            <div className="space-y-3">
              {quickGradingAttempts.map((attempt) => (
                <QuickGradingCard
                  key={attempt.id}
                  attempt={attempt}
                  draftScore={draftScores[attempt.id] ?? ''}
                  onDraftScoreChange={(score) =>
                    setDraftScores((current) => ({
                      ...current,
                      [attempt.id]: score,
                    }))
                  }
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <AttemptCard
                  key={attempt.id}
                  attempt={attempt}
                  courseSlug={courseSlug}
                  selected={selectedAttemptIds.includes(attempt.id)}
                  onSelectedChange={(checked) =>
                    setSelectedAttemptIds((current) =>
                      checked
                        ? Array.from(new Set([...current, attempt.id]))
                        : current.filter(
                            (attemptId) => attemptId !== attempt.id
                          )
                    )
                  }
                />
              ))}
            </div>
          )}

          <BottomActionBar
            attempts={attempts}
            selectedAttempts={selectedAttempts}
            quickGrading={isQuickGrading}
            hasDraftChanges={hasDraftChanges}
            feedbackTextVisible={feedbackTextVisible}
            savePending={saveQuickGradesMutation.isPending}
            onSelectAll={() =>
              setSelectedAttemptIds(attempts.map((attempt) => attempt.id))
            }
            onClearSelection={() => setSelectedAttemptIds([])}
            onStartQuickGradingAll={() => startQuickGrading(attempts)}
            onStartQuickGradingSelection={() =>
              startQuickGrading(selectedAttempts)
            }
            onExitQuickGrading={exitQuickGrading}
            onFeedbackTextVisibleChange={setFeedbackTextVisible}
            onSaveQuickGrades={saveQuickGrades}
          />
        </section>
      </div>
    </main>
  );
}
