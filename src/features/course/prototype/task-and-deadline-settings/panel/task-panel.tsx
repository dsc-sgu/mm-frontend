// PROTOTYPE (#181): one Task panel for Course view, the Course Page editor
// and (later) the Task page. Hosts decide where it sits; the panel decides
// what is inside.
import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Lock, Minimize2, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { OTHER_TEACHER } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  isExpandedStatement,
  newTasksInDraft,
} from '@/features/course/prototype/task-and-deadline-settings/settings';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import { useEffectiveLease } from '@/features/course/prototype/task-and-deadline-settings/use-lease';
import { formatClock } from '@/features/course/prototype/task-and-deadline-settings/time';
import {
  AnnotationRow,
  AttachmentsBlock,
  Block,
  GradeRow,
  AttemptsRow,
  GroupRow,
  KeyRow,
  OverridesBlock,
  PatternsRow,
  ScheduleRows,
  StatementBlock,
  TitleInput,
} from './fields';
import { PublishFooter } from './publish-footer';
import {
  changedFields,
  editsOf,
  type PanelResult,
  type PanelSession,
} from './session';
import { StatementEditor } from '@/features/course/prototype/task-and-deadline-settings/panel/statement/editor';
import { PageStatementEditor } from '@/features/course/prototype/task-and-deadline-settings/panel/statement/page-editor';
import { validateKey } from './task-key';

type Status = { label: string; tone: string };

function maxGradeError(maxGrade: number | null): string | undefined {
  if (maxGrade === null) {
    return 'Введите максимальный балл: по умолчанию его нет';
  }

  return Number.isInteger(maxGrade) && maxGrade > 0
    ? undefined
    : 'Целое число больше нуля';
}

function maxAttemptsError(maxAttempts: number | null): string | undefined {
  if (maxAttempts === null) {
    return undefined;
  }

  return Number.isInteger(maxAttempts) && maxAttempts > 0
    ? undefined
    : 'Целое число больше нуля или пусто, если без ограничений';
}

function panelStatus({
  removed,
  readOnly,
  visibleErrors,
  changedCount,
  result,
}: {
  removed: boolean;
  readOnly: boolean;
  visibleErrors: boolean;
  changedCount: number;
  result: PanelResult;
}): Status {
  if (removed) {
    return { label: 'Удалено', tone: 'bg-red-500' };
  }
  if (readOnly) {
    return { label: 'Только чтение', tone: 'bg-muted-foreground' };
  }
  if (visibleErrors) {
    return { label: 'Есть ошибки', tone: 'bg-red-500' };
  }
  if (changedCount > 0) {
    return { label: `Изменено полей: ${changedCount}`, tone: 'bg-amber-500' };
  }

  switch (result.kind) {
    case 'applied':
      return {
        label: `Применено в ${formatClock(result.at)}`,
        tone: 'bg-emerald-500',
      };
    case 'draft':
      return { label: 'В черновике курса', tone: 'bg-violet-500' };
    default:
      return { label: 'Без изменений', tone: 'bg-border' };
  }
}

export function TaskPanel({
  session,
  courseSlug,
  onClose,
  onRevealInDocument,
  onCreateAnother,
}: {
  session: PanelSession;
  courseSlug: string;
  onClose: () => void;
  onRevealInDocument?: () => void;
  onCreateAnother?: () => void;
}) {
  const { taskApply, statement, panelLook } = usePrototypeSettings();
  const courseAccess = useSandbox((state) => state.courseAccess);
  const { lease, sameTask } = useEffectiveLease();
  const taskGroups = useSandbox((state) => state.taskGroups);
  const tasks = useSandbox((state) => state.tasks);
  const newTaskIds = useSandbox((state) => state.newTaskIds);
  const saveNewTask = useSandbox((state) => state.saveNewTask);
  const draftNewTask = useSandbox((state) => state.draftNewTask);
  const removed = useSandbox((state) =>
    state.removedTaskIds.includes(session.taskId)
  );
  const writeTaskToDraft = useSandbox((state) => state.writeTaskToDraft);
  const [attempted, setAttempted] = useState(false);

  const readOnly =
    (taskApply === 'course' && lease.holder === 'other') || removed;
  const locked = courseAccess === 'open';
  const form = session.form;
  const fields = changedFields(session.base, form);
  const group = taskGroups.find((item) => item.id === form.groupId);
  const takenKeys = (group?.taskIds ?? [])
    .filter((taskId) => taskId !== session.taskId)
    .map((taskId) => tasks[taskId]?.key.toLowerCase() ?? '');

  const allErrors: Partial<Record<string, string>> = {
    title: form.title.trim() ? undefined : 'Введите название',
    key: validateKey(form.key, takenKeys) ?? undefined,
    maxGrade: maxGradeError(form.maxGrade),
    maxAttempts: maxAttemptsError(form.maxAttempts),
  };
  const hasErrors = Object.values(allErrors).some(Boolean);
  const errors = Object.fromEntries(
    Object.entries(allErrors).filter(
      ([key]) => attempted || fields.includes(key as never)
    )
  );
  const visibleErrors = Object.values(errors).some(Boolean);

  const status = panelStatus({
    removed,
    readOnly,
    visibleErrors,
    changedCount: fields.length,
    result: session.result,
  });

  const fieldProps = { session, readOnly, locked, errors };
  const expanded = isExpandedStatement(statement) && session.expanded;

  const body = (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto',
        panelLook === 'cards' && 'grid content-start gap-3 pb-3'
      )}
    >
      {readOnly && !removed ? (
        <div className="flex gap-2 border-b bg-muted/60 px-5 py-2.5 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            {sameTask
              ? `Это задание сейчас правит ${OTHER_TEACHER.shortName} `
              : `Курс редактирует ${OTHER_TEACHER.shortName} `}
            Задание правится через черновик курса, а у него блокировка
            редактирования курса с{' '}
            {lease.holder === 'other' ? formatClock(lease.since) : ''}. Пока он
            не опубликует курс или не снимет блокировку, здесь только просмотр.
          </span>
        </div>
      ) : null}
      {/* Title on top of everything, as in Linear / Asana task panels. */}
      <div className={cn('px-5 pt-5', panelLook === 'cards' ? 'pb-3' : 'pb-1')}>
        <TitleInput {...fieldProps} />
      </div>
      <Block
        title={panelLook === 'cards' ? 'Свойства' : undefined}
        divided={false}
      >
        <KeyRow {...fieldProps} />
        <GroupRow {...fieldProps} />
        <GradeRow {...fieldProps} />
        <AttemptsRow {...fieldProps} />
        <ScheduleRows session={session} courseSlug={courseSlug} />
        <PatternsRow {...fieldProps} />
        <AnnotationRow {...fieldProps} />
        {locked ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" /> не меняется после открытия курса
          </p>
        ) : null}
      </Block>
      <OverridesBlock session={session} courseSlug={courseSlug} />
      <StatementBlock {...fieldProps} onRevealInDocument={onRevealInDocument} />
      <AttachmentsBlock {...fieldProps} />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-5">
        <p className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
          <span className="truncate">{group?.title ?? 'Без группы'}</span>
          <ChevronRight className="size-3.5 shrink-0 opacity-60" />
          <span className="truncate font-mono text-[0.8125rem] text-foreground">
            {form.key || 'новая'}
          </span>
        </p>
        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs text-muted-foreground">
          <span className={cn('size-1.5 rounded-full', status.tone)} />
          {status.label}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Закрыть панель"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>

      {expanded ? (
        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_26rem]">
          <div className="flex min-h-0 flex-col gap-2 border-b p-5 md:border-r md:border-b-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Условие</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => session.setExpanded(false)}
              >
                <Minimize2 /> Свернуть
              </Button>
            </div>
            {statement === 'expanded-page' ? (
              // The Course Page editor, as on the page: blocks with handles
              // to the left of the text need room, hence the side padding.
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PageStatementEditor
                  value={form.statement}
                  disabled={readOnly}
                  onChange={(value) => session.setField('statement', value)}
                  className="mx-auto w-full max-w-3xl px-8 pb-24"
                />
              </div>
            ) : (
              <StatementEditor
                autoFocus
                value={form.statement}
                disabled={readOnly}
                onChange={(value) => session.setField('statement', value)}
                className="min-h-64 flex-1 overflow-hidden"
                contentClassName="flex-1 overflow-y-auto"
              />
            )}
          </div>
          <div className="flex min-h-0 flex-col">{body}</div>
        </div>
      ) : (
        body
      )}

      <PublishFooter
        session={session}
        hasErrors={hasErrors}
        onAttempt={() => setAttempted(true)}
        onCreateAnother={
          onCreateAnother
            ? () => {
                setAttempted(true);
                if (hasErrors) {
                  return;
                }
                // «Создать ещё» keeps this Task first, then carries its
                // group, Grade and schedule into the next one.
                if (newTaskIds.includes(session.taskId)) {
                  if (newTasksInDraft(taskApply)) {
                    draftNewTask(session.taskId, form);
                  } else {
                    saveNewTask(session.taskId, form);
                  }
                } else if (fields.length > 0 && newTasksInDraft(taskApply)) {
                  // The draft holds only the `taskId` of a published Task.
                  toast.error(
                    'Сначала опубликуйте правки этого задания или отмените их'
                  );
                  return;
                } else if (fields.length > 0) {
                  writeTaskToDraft(session.taskId, editsOf(session.base, form));
                }
                onCreateAnother();
              }
            : undefined
        }
      />
    </div>
  );
}
