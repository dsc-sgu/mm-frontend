// PROTOTYPE (#181): one Task panel for Course view, the Course Page editor
// and (later) the Task page. Hosts decide where it sits; the panel decides
// what is inside.
import { useState } from 'react';
import { ChevronRight, Lock, Minimize2, X } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { OTHER_TEACHER } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';
import { formatClock } from '@/features/course/prototype/task-and-deadline-settings/time';
import {
  AnnotationRow,
  AttachmentsBlock,
  GradeRow,
  GroupRow,
  KeyRow,
  PatternsRow,
  ScheduleRows,
  StatementBlock,
  StatementTextarea,
  TitleInput,
} from './fields';
import { PublishFooter } from './publish-footer';
import { changedFields, editsOf, type PanelSession } from './session';
import { validateKey } from './task-key';

type Status = { label: string; tone: string };

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
  const { taskApply, statement } = usePrototypeSettings();
  const courseAccess = useSandbox((state) => state.courseAccess);
  const lease = useSandbox((state) => state.lease);
  const taskGroups = useSandbox((state) => state.taskGroups);
  const tasks = useSandbox((state) => state.tasks);
  const newTaskIds = useSandbox((state) => state.newTaskIds);
  const saveNewTask = useSandbox((state) => state.saveNewTask);
  const writeTaskToDraft = useSandbox((state) => state.writeTaskToDraft);
  const [attempted, setAttempted] = useState(false);

  const readOnly = taskApply === 'course' && lease.holder === 'other';
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
    maxGrade:
      form.maxGrade === null
        ? 'Введите максимальную Grade: по умолчанию её нет'
        : !Number.isInteger(form.maxGrade) || form.maxGrade <= 0
          ? 'Целое число больше нуля'
          : undefined,
  };
  const hasErrors = Object.values(allErrors).some(Boolean);
  const errors = Object.fromEntries(
    Object.entries(allErrors).filter(
      ([key]) => attempted || fields.includes(key as never)
    )
  );
  const visibleErrors = Object.values(errors).some(Boolean);

  const status: Status = readOnly
    ? { label: 'Только чтение', tone: 'bg-muted-foreground' }
    : visibleErrors
      ? { label: 'Есть ошибки', tone: 'bg-red-500' }
      : fields.length > 0
        ? { label: `Изменено полей: ${fields.length}`, tone: 'bg-amber-500' }
        : session.result.kind === 'applied'
          ? {
              label: `Применено в ${formatClock(session.result.at)}`,
              tone: 'bg-emerald-500',
            }
          : session.result.kind === 'draft'
            ? { label: 'В черновике курса', tone: 'bg-violet-500' }
            : { label: 'Без изменений', tone: 'bg-border' };

  const fieldProps = { session, readOnly, locked, errors };
  const expanded = statement === 'expanded' && session.expanded;

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {readOnly ? (
        <div className="flex gap-2 border-b bg-muted/60 px-5 py-2.5 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Курс редактирует {OTHER_TEACHER.shortName} с{' '}
            {lease.holder === 'other' ? formatClock(lease.since) : ''}. Task
            правится через черновик курса, поэтому пока только просмотр.
          </span>
        </div>
      ) : null}
      <div className="grid gap-3 px-5 pt-4 pb-4">
        <TitleInput {...fieldProps} />
        <div className="grid gap-0.5">
          <KeyRow {...fieldProps} />
          <GroupRow {...fieldProps} />
          <GradeRow {...fieldProps} />
          <ScheduleRows session={session} courseSlug={courseSlug} />
          <PatternsRow {...fieldProps} />
          <AnnotationRow {...fieldProps} />
        </div>
        {locked ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" /> не меняется после открытия Course
          </p>
        ) : null}
      </div>
      <StatementBlock {...fieldProps} onRevealInDocument={onRevealInDocument} />
      <AttachmentsBlock {...fieldProps} />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-5">
        <p className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
          <span className="truncate">{group?.title ?? 'Без группы'}</span>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="truncate font-mono text-foreground">
            {form.key || 'новая'}
          </span>
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn('size-2 rounded-full', status.tone)} />
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
            <StatementTextarea
              autoFocus
              value={form.statement}
              disabled={readOnly}
              onChange={(value) => session.setField('statement', value)}
              className="min-h-64 flex-1 resize-none"
            />
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
          onCreateAnother && courseAccess === 'draft'
            ? () => {
                setAttempted(true);
                if (hasErrors) {
                  return;
                }
                // «Создать ещё» keeps this Task first, then carries its
                // group, Grade and schedule into the next one.
                if (newTaskIds.includes(session.taskId)) {
                  saveNewTask(session.taskId, form);
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
