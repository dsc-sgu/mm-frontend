// PROTOTYPE (#181): fields of the Task panel per #180 «Поля панели».
// Task Group and masks are simplified but sized like the real ones (#190,
// #191 extend them).
import { useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  GitBranch,
  GripVertical,
  Lock,
  Maximize2,
  Paperclip,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Input } from '@/shadcn/components/ui/input';
import { cn } from '@/shadcn/lib/utils';
import type { TaskGroup } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import { overrideCounts } from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  useOpenVariant,
  usePrototypeSettings,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { formatMoment } from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { LevelEditor } from '@/features/course/prototype/task-and-deadline-settings/ui/level-editor';
import { OpeningTimeField } from '@/features/course/prototype/task-and-deadline-settings/ui/opening-time-field';
import {
  PendingDot,
  TaskScheduleEditor,
} from '@/features/course/prototype/task-and-deadline-settings/ui/task-schedule-editor';
import type { PanelSession } from './session';
import { suggestKey } from './task-key';

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  locked,
  aside,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  locked?: boolean;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </label>
        {locked ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title="Меняется только пока Course draft"
          >
            <Lock className="size-3" /> после открытия не меняется
          </span>
        ) : (
          aside
        )}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-4 border-b border-border px-5 py-5 last:border-b-0">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

type FieldProps = {
  session: PanelSession;
  readOnly: boolean;
  locked: boolean;
  errors: Partial<Record<string, string>>;
};

export function TitleField({ session, readOnly, errors }: FieldProps) {
  return (
    <Field label="Название" htmlFor="task-title" required error={errors.title}>
      <Input
        id="task-title"
        value={session.form.title}
        disabled={readOnly}
        placeholder="Например, «Docker-образ приложения»"
        aria-invalid={Boolean(errors.title)}
        onChange={(event) => {
          session.setField('title', event.target.value);
          if (!session.keyTouched) {
            session.setField('key', suggestKey(event.target.value));
          }
        }}
      />
    </Field>
  );
}

export function KeyField({ session, readOnly, locked, errors }: FieldProps) {
  return (
    <Field
      label="Task Key"
      htmlFor="task-key"
      required
      locked={locked}
      error={errors.key}
      hint={
        session.keyTouched
          ? 'Students называют им Task при сдаче через Git'
          : 'Предложен по названию; можно изменить'
      }
    >
      <Input
        id="task-key"
        value={session.form.key}
        disabled={readOnly || locked}
        className="font-mono"
        aria-invalid={Boolean(errors.key)}
        onChange={(event) => {
          session.setKeyTouched(true);
          session.setField('key', event.target.value);
        }}
      />
    </Field>
  );
}

export function GroupField({ session, readOnly, locked }: FieldProps) {
  const taskGroups = useSandbox((state) => state.taskGroups);
  const tasks = useSandbox((state) => state.tasks);
  const updateTaskGroup = useSandbox((state) => state.updateTaskGroup);
  const [open, setOpen] = useState(false);
  const group = taskGroups.find((item) => item.id === session.form.groupId);

  return (
    <Field
      label="Task Group"
      htmlFor="task-group"
      required
      locked={locked}
      hint="Перенос в другую группу — только пока Course draft; Task встанет в конец (#190)"
    >
      <div className="flex gap-2">
        <select
          id="task-group"
          value={session.form.groupId}
          disabled={readOnly || locked}
          onChange={(event) => session.setField('groupId', event.target.value)}
          className={cn(
            'h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm',
            'disabled:cursor-not-allowed disabled:opacity-60'
          )}
        >
          {taskGroups.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} · {item.key}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="icon"
          aria-label="Раздел группы"
          onClick={() => setOpen(!open)}
        >
          <ChevronDown
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </Button>
      </div>
      {open && group ? (
        <GroupSection
          group={group}
          currentTaskId={session.taskId}
          taskTitle={(taskId) =>
            taskId === session.taskId
              ? session.form.title || 'Новая Task'
              : (tasks[taskId]?.title ?? taskId)
          }
          readOnly={readOnly}
          locked={locked}
          onRename={(title) => updateTaskGroup(group.id, { title })}
        />
      ) : null}
    </Field>
  );
}

function GroupSection({
  group,
  currentTaskId,
  taskTitle,
  readOnly,
  locked,
  onRename,
}: {
  group: TaskGroup;
  currentTaskId: string;
  taskTitle: (taskId: string) => string;
  readOnly: boolean;
  locked: boolean;
  onRename: (title: string) => void;
}) {
  const [title, setTitle] = useState(group.title);

  return (
    <div className="mt-1 grid gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Раздел группы — упрощённо; полноценный UI решает #190.
      </p>
      <div className="grid grid-cols-[1fr_8rem] gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Название группы
          <Input
            value={title}
            disabled={readOnly}
            className="h-8 text-sm"
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => title !== group.title && onRename(title)}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Task Group Key
          <Input
            value={group.key}
            disabled
            title={locked ? 'Меняется только пока Course draft' : undefined}
            className="h-8 font-mono text-sm"
            readOnly
          />
        </label>
      </div>
      <div className="grid gap-1 text-xs">
        <span className="text-muted-foreground">Шаблонный репозиторий</span>
        <code className="truncate rounded bg-background px-2 py-1">
          https://mm.sgu.ru/git/sit-2026/templates/{group.key}.git
        </code>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <GitBranch className="size-3.5" />
          {group.template.state === 'empty'
            ? 'Пуст — Students получат пустой репозиторий'
            : `${group.template.commit} «${group.template.message}» · ${formatMoment(group.template.at)}`}
        </span>
      </div>
      <div className="grid gap-1 text-xs">
        <span className="text-muted-foreground">
          Порядок выполнения в группе
        </span>
        <ol className="grid gap-0.5">
          {group.taskIds.map((taskId, index) => (
            <li
              key={taskId}
              className={cn(
                'flex items-center gap-2 rounded px-1.5 py-1',
                taskId === currentTaskId
                  ? 'bg-primary/10 font-medium text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <GripVertical
                className={cn('size-3.5', locked && 'opacity-30')}
                aria-hidden="true"
              />
              <span className="w-4 tabular-nums">{index + 1}.</span>
              <span className="truncate">{taskTitle(taskId)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function StatementField({
  session,
  readOnly,
  onRevealInDocument,
}: FieldProps & { onRevealInDocument?: () => void }) {
  const { statement } = usePrototypeSettings();
  const long = session.form.statement.length > 600;

  if (statement === 'inline' && onRevealInDocument) {
    return (
      <Field
        label="Условие"
        aside={
          <Button variant="link" size="xs" onClick={onRevealInDocument}>
            В документе <ArrowUpRight />
          </Button>
        }
      >
        <p className="line-clamp-3 rounded-md border border-dashed border-border px-3 py-2 text-sm whitespace-pre-line text-muted-foreground">
          {session.form.statement || 'Пусто'}
        </p>
        <p className="text-xs text-muted-foreground">
          Условие правится прямо на месте Task Reference в документе.
        </p>
      </Field>
    );
  }

  if (statement === 'expanded' && !session.expanded) {
    return (
      <Field
        label="Условие"
        aside={
          <Button
            variant="link"
            size="xs"
            onClick={() => session.setExpanded(true)}
          >
            Развернуть <Maximize2 />
          </Button>
        }
      >
        <button
          type="button"
          onClick={() => session.setExpanded(true)}
          className="line-clamp-4 rounded-md border border-border px-3 py-2 text-left text-sm whitespace-pre-line hover:bg-muted/50"
        >
          {session.form.statement || 'Пусто — нажмите, чтобы написать'}
        </button>
      </Field>
    );
  }

  if (statement === 'expanded') {
    // The expanded layout renders the statement editor in its own column.
    return null;
  }

  return (
    <Field label="Условие" hint="Markdown">
      <StatementTextarea
        value={session.form.statement}
        disabled={readOnly}
        rows={long ? 14 : 6}
        onChange={(value) => session.setField('statement', value)}
      />
    </Field>
  );
}

export function StatementTextarea({
  value,
  onChange,
  disabled,
  rows = 8,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder="Что нужно сделать, как сдать, как будем проверять…"
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full resize-y rounded-md border border-input bg-background px-3 py-2',
        'text-sm leading-6 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
    />
  );
}

export function AttachmentsField({ session, readOnly }: FieldProps) {
  const attachments = session.form.attachments;

  return (
    <Field label="Вложения">
      <ul className="grid gap-1">
        {attachments.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
          >
            <Paperclip className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground">{file.size}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Удалить вложение"
              disabled={readOnly}
              onClick={() =>
                session.setField(
                  'attachments',
                  attachments.filter((_, item) => item !== index)
                )
              }
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button
          variant="outline"
          size="xs"
          disabled={readOnly}
          onClick={() =>
            session.setField('attachments', [
              ...attachments,
              {
                name: `Материалы ${attachments.length + 1}.pdf`,
                size: '64 КБ',
              },
            ])
          }
        >
          <Plus /> Файл
        </Button>
      </div>
    </Field>
  );
}

export function AnnotationField({ session, readOnly }: FieldProps) {
  return (
    <Field
      label="Аннотация Task Summary"
      hint="Видна Students даже у закрытой Task"
    >
      <Input
        value={session.form.annotation}
        disabled={readOnly}
        placeholder="Необязательно"
        onChange={(event) => session.setField('annotation', event.target.value)}
      />
    </Field>
  );
}

export function MaxGradeField({
  session,
  readOnly,
  locked,
  errors,
}: FieldProps) {
  return (
    <Field
      label="Максимальная Grade"
      htmlFor="task-max-grade"
      required
      locked={locked}
      error={errors.maxGrade}
    >
      <Input
        id="task-max-grade"
        type="number"
        min={1}
        value={session.form.maxGrade ?? ''}
        disabled={readOnly || locked}
        className="w-32"
        aria-invalid={Boolean(errors.maxGrade)}
        onChange={(event) =>
          session.setField(
            'maxGrade',
            event.target.value === '' ? null : Number(event.target.value)
          )
        }
      />
    </Field>
  );
}

export function PatternsField({ session, readOnly }: FieldProps) {
  const courseAccess = useSandbox((state) => state.courseAccess);
  const patterns = session.form.patterns;

  return (
    <Field
      label="Маски путей"
      hint={
        courseAccess === 'open'
          ? 'Пусто — любые файлы. Новая маска действует на следующие сдачи (#191)'
          : 'Пусто — любые файлы. Полноценный редактор — #191'
      }
    >
      <ul className="grid gap-1">
        {patterns.map((pattern, index) => (
          <li key={index} className="flex gap-1">
            <Input
              value={pattern}
              disabled={readOnly}
              className="h-8 font-mono text-sm"
              onChange={(event) =>
                session.setField(
                  'patterns',
                  patterns.map((item, at) =>
                    at === index ? event.target.value : item
                  )
                )
              }
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Удалить маску"
              disabled={readOnly}
              onClick={() =>
                session.setField(
                  'patterns',
                  patterns.filter((_, at) => at !== index)
                )
              }
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button
          variant="outline"
          size="xs"
          disabled={readOnly}
          onClick={() => session.setField('patterns', [...patterns, ''])}
        >
          <Plus /> Маска
        </Button>
      </div>
    </Field>
  );
}

export function ScheduleFields({
  session,
  readOnly,
  courseSlug,
}: {
  session: PanelSession;
  readOnly: boolean;
  courseSlug: string;
}) {
  const { deadlineField } = usePrototypeSettings();
  const schedule = useViewSchedule();
  const edit = useScheduleEdit();
  const openVariant = useOpenVariant(courseSlug);
  const { keys } = usePendingChanges();
  const taskId = session.taskId;
  const task = schedule.tasks[taskId];
  const label = session.form.title || 'Новая Task';
  const counts = overrideCounts(schedule, taskId);

  if (!task) {
    return null;
  }

  return (
    <>
      <Field
        label="Task Opening Time"
        aside={<PendingDot show={keys.has(`${taskId}|opening`)} />}
      >
        <OpeningTimeField
          taskId={taskId}
          disabled={readOnly}
          onCommands={(commands) => edit(commands, `${label}: открытие`)}
        />
      </Field>

      {deadlineField === 'full' ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Сроки</p>
          <TaskScheduleEditor
            taskId={taskId}
            taskTitle={label}
            showOpening={false}
          />
        </div>
      ) : (
        <Field
          label="Deadline уровня Task"
          aside={<PendingDot show={keys.has(`${taskId}|task`)} />}
        >
          <LevelEditor
            taskId={taskId}
            value={task.deadline}
            onCommands={(commands) => edit(commands, `${label}: общий срок`)}
          />
          <button
            type="button"
            onClick={() => openVariant('A', { task: taskId })}
            className={cn(
              'flex items-center justify-between gap-2 rounded-md border border-border',
              'px-3 py-2 text-left text-sm hover:bg-muted/60'
            )}
          >
            <span>
              Переопределений: <b>{counts.total}</b>
              {counts.total > 0 ? (
                <span className="text-muted-foreground">
                  {' '}
                  · групп {counts.groups}, личных {counts.students}
                </span>
              ) : null}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-primary">
              Экран сроков <ArrowUpRight className="size-3.5" />
            </span>
          </button>
        </Field>
      )}
    </>
  );
}
