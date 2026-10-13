// PROTOTYPE (#181): fields of the Task panel per #180 «Поля панели», laid
// out as a property list (Linear, Twenty, Asana): label on the left, the
// value edited in place. Task Group and masks are simplified but sized like
// the real ones (#190, #191 extend them).
import { useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  GitBranch,
  GripVertical,
  Maximize2,
  Paperclip,
  Plus,
  X,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
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
import { PropertyRow } from '@/features/course/prototype/task-and-deadline-settings/ui/property-row';
import {
  DeadlineRow,
  OpeningRow,
  TaskScheduleEditor,
} from '@/features/course/prototype/task-and-deadline-settings/ui/task-schedule-editor';
import type { PanelSession } from './session';
import { suggestKey } from './task-key';

/** Borderless until hovered or focused, like Linear property values. */
const GHOST_INPUT = cn(
  'h-8 min-w-0 rounded-md border border-transparent bg-transparent px-2 -mx-2 text-sm',
  'outline-none placeholder:text-muted-foreground hover:border-input',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
  'aria-invalid:border-destructive disabled:pointer-events-none'
);

type FieldProps = {
  session: PanelSession;
  readOnly: boolean;
  locked: boolean;
  errors: Partial<Record<string, string>>;
};

export function Block({
  title,
  aside,
  children,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-1 border-t px-5 py-4">
      {title ? (
        <div className="flex min-h-7 items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function TitleInput({ session, readOnly, errors }: FieldProps) {
  return (
    <div className="grid gap-1">
      <input
        value={session.form.title}
        disabled={readOnly}
        placeholder="Название Task"
        aria-label="Название"
        aria-invalid={Boolean(errors.title)}
        onChange={(event) => {
          session.setField('title', event.target.value);
          if (!session.keyTouched) {
            session.setField('key', suggestKey(event.target.value));
          }
        }}
        className={cn(
          GHOST_INPUT,
          'h-auto py-1 text-xl font-semibold tracking-tight'
        )}
      />
      {errors.title ? (
        <p className="text-xs text-destructive">{errors.title}</p>
      ) : null}
    </div>
  );
}

export function KeyRow({ session, readOnly, locked, errors }: FieldProps) {
  return (
    <PropertyRow
      label="Task Key"
      locked={locked}
      error={errors.key}
      note={
        !session.keyTouched && session.form.key ? (
          <p className="text-xs text-muted-foreground">Предложен по названию</p>
        ) : null
      }
    >
      {locked ? (
        <span className="font-mono text-sm">{session.form.key}</span>
      ) : (
        <input
          value={session.form.key}
          disabled={readOnly}
          placeholder="Появится по названию"
          aria-label="Task Key"
          aria-invalid={Boolean(errors.key)}
          onChange={(event) => {
            session.setKeyTouched(true);
            session.setField('key', event.target.value);
          }}
          className={cn(GHOST_INPUT, 'w-full font-mono')}
        />
      )}
    </PropertyRow>
  );
}

export function GroupRow({ session, readOnly, locked }: FieldProps) {
  const taskGroups = useSandbox((state) => state.taskGroups);
  const tasks = useSandbox((state) => state.tasks);
  const updateTaskGroup = useSandbox((state) => state.updateTaskGroup);
  const [open, setOpen] = useState(false);
  const group = taskGroups.find((item) => item.id === session.form.groupId);

  return (
    <>
      <PropertyRow label="Task Group" locked={locked}>
        {locked ? (
          <span className="truncate text-sm">{group?.title}</span>
        ) : (
          <select
            value={session.form.groupId}
            disabled={readOnly}
            aria-label="Task Group"
            onChange={(event) =>
              session.setField('groupId', event.target.value)
            }
            className={cn(GHOST_INPUT, 'cursor-pointer')}
          >
            {taskGroups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          О группе
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </PropertyRow>
      {open && group ? (
        <GroupSection
          key={group.id}
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
    </>
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
    <div className="my-1 ml-[9.25rem] grid gap-2 rounded-lg bg-muted/50 p-3 text-sm">
      <input
        value={title}
        disabled={readOnly}
        aria-label="Название группы"
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => title !== group.title && onRename(title)}
        className={cn(GHOST_INPUT, 'mx-0 font-medium')}
      />
      <p className="text-xs text-muted-foreground">
        Ключ <span className="font-mono text-foreground">{group.key}</span>
        {locked ? ', после открытия не меняется' : ''}
      </p>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <GitBranch className="mt-px size-3.5 shrink-0" />
        <span>
          {group.template.state === 'empty'
            ? 'Шаблон пуст: Students получат пустой репозиторий'
            : `Шаблон: ${group.template.commit} «${group.template.message}», ${formatMoment(group.template.at)}`}
        </span>
      </p>
      <ol className="grid gap-0.5 text-xs">
        {group.taskIds.map((taskId, index) => (
          <li
            key={taskId}
            className={cn(
              'flex items-center gap-2 rounded px-1 py-0.5',
              taskId === currentTaskId
                ? 'bg-background font-medium text-foreground shadow-xs'
                : 'text-muted-foreground'
            )}
          >
            <GripVertical
              className={cn('size-3.5', locked && 'opacity-30')}
              aria-hidden="true"
            />
            <span className="w-4 tabular-nums">{index + 1}</span>
            <span className="truncate">{taskTitle(taskId)}</span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-muted-foreground">
        Упрощённый раздел, полноценный разбирает #190
      </p>
    </div>
  );
}

export function GradeRow({ session, readOnly, locked, errors }: FieldProps) {
  return (
    <PropertyRow label="Макс. Grade" locked={locked} error={errors.maxGrade}>
      {locked ? (
        <span className="text-sm tabular-nums">{session.form.maxGrade}</span>
      ) : (
        <input
          type="number"
          min={1}
          value={session.form.maxGrade ?? ''}
          disabled={readOnly}
          placeholder="Нет"
          aria-label="Максимальная Grade"
          aria-invalid={Boolean(errors.maxGrade)}
          onChange={(event) =>
            session.setField(
              'maxGrade',
              event.target.value === '' ? null : Number(event.target.value)
            )
          }
          className={cn(GHOST_INPUT, 'w-24 tabular-nums')}
        />
      )}
    </PropertyRow>
  );
}

export function PatternsRow({ session, readOnly }: FieldProps) {
  const courseAccess = useSandbox((state) => state.courseAccess);
  const patterns = session.form.patterns;

  return (
    <PropertyRow
      label="Маски путей"
      note={
        courseAccess === 'open' && patterns.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Новая маска действует на следующие сдачи
          </p>
        ) : null
      }
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1 py-1">
        {patterns.length === 0 ? (
          <span className="text-sm text-muted-foreground">Любые файлы</span>
        ) : null}
        {patterns.map((pattern, index) => (
          <span
            key={index}
            className="inline-flex h-7 items-center rounded-md border border-border bg-muted/40 pl-2"
          >
            <input
              value={pattern}
              disabled={readOnly}
              aria-label={`Маска ${index + 1}`}
              size={Math.max(6, pattern.length)}
              onChange={(event) =>
                session.setField(
                  'patterns',
                  patterns.map((item, at) =>
                    at === index ? event.target.value : item
                  )
                )
              }
              className="bg-transparent font-mono text-xs outline-none"
            />
            <button
              type="button"
              aria-label="Убрать маску"
              disabled={readOnly}
              onClick={() =>
                session.setField(
                  'patterns',
                  patterns.filter((_, at) => at !== index)
                )
              }
              className="grid h-full w-6 place-items-center text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Добавить маску"
          disabled={readOnly}
          onClick={() => session.setField('patterns', [...patterns, ''])}
        >
          <Plus />
        </Button>
      </div>
    </PropertyRow>
  );
}

export function AnnotationRow({ session, readOnly }: FieldProps) {
  return (
    <PropertyRow label="Аннотация">
      <input
        value={session.form.annotation}
        disabled={readOnly}
        placeholder="Видна Students даже у закрытой Task"
        aria-label="Аннотация Task Summary"
        onChange={(event) => session.setField('annotation', event.target.value)}
        className={cn(GHOST_INPUT, 'w-full')}
      />
    </PropertyRow>
  );
}

export function ScheduleRows({
  session,
  courseSlug,
}: {
  session: PanelSession;
  courseSlug: string;
}) {
  const { deadlineField } = usePrototypeSettings();
  const schedule = useViewSchedule();
  const edit = useScheduleEdit();
  const openVariant = useOpenVariant(courseSlug);
  const taskId = session.taskId;
  const label = session.form.title || 'Новая Task';
  const counts = overrideCounts(schedule, taskId);

  if (!schedule.tasks[taskId]) {
    return null;
  }

  return (
    <>
      <OpeningRow
        taskId={taskId}
        label={label}
        onCommands={(commands) => edit(commands, `${label}: открытие`)}
      />
      <DeadlineRow
        taskId={taskId}
        label={label}
        onCommands={(commands) => edit(commands, `${label}: общий дедлайн`)}
      />
      {deadlineField === 'counter' ? (
        <PropertyRow label="Переопределения">
          <button
            type="button"
            onClick={() => openVariant('A', { task: taskId })}
            className="-mx-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm hover:bg-muted"
          >
            {counts.total === 0 ? (
              <span className="text-muted-foreground">Нет</span>
            ) : (
              <span>
                {counts.total}
                <span className="text-muted-foreground">
                  {' '}
                  (групп {counts.groups}, личных {counts.students})
                </span>
              </span>
            )}
            <ArrowUpRight className="size-3.5 text-muted-foreground" />
          </button>
        </PropertyRow>
      ) : null}
    </>
  );
}

/** Every override of this Task right in the panel (`?deadlineField=full`). */
export function OverridesBlock({
  session,
  courseSlug,
}: {
  session: PanelSession;
  courseSlug: string;
}) {
  const { deadlineField } = usePrototypeSettings();
  const schedule = useViewSchedule();
  const openVariant = useOpenVariant(courseSlug);
  const taskId = session.taskId;

  if (deadlineField !== 'full' || !schedule.tasks[taskId]) {
    return null;
  }

  return (
    <Block
      title="Переопределения дедлайнов"
      aside={
        <Button
          variant="ghost"
          size="xs"
          onClick={() => openVariant('A', { task: taskId })}
        >
          Страница дедлайнов <ArrowUpRight />
        </Button>
      }
    >
      <TaskScheduleEditor
        taskId={taskId}
        taskTitle={session.form.title || 'Новая Task'}
        showOpening={false}
        showTaskDeadline={false}
      />
    </Block>
  );
}

export function StatementBlock({
  session,
  readOnly,
  onRevealInDocument,
}: FieldProps & { onRevealInDocument?: () => void }) {
  const { statement } = usePrototypeSettings();
  const long = session.form.statement.length > 600;

  if (statement === 'inline' && onRevealInDocument) {
    return (
      <Block
        title="Условие"
        aside={
          <Button variant="ghost" size="xs" onClick={onRevealInDocument}>
            Править в документе <ArrowUpRight />
          </Button>
        }
      >
        <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
          {session.form.statement || 'Пусто'}
        </p>
      </Block>
    );
  }

  if (statement === 'expanded') {
    // The expanded layout puts the editor in its own column.
    return session.expanded ? null : (
      <Block
        title="Условие"
        aside={
          <Button
            variant="ghost"
            size="xs"
            onClick={() => session.setExpanded(true)}
          >
            <Maximize2 /> Развернуть
          </Button>
        }
      >
        <button
          type="button"
          onClick={() => session.setExpanded(true)}
          className="line-clamp-4 rounded-md text-left text-sm whitespace-pre-line text-muted-foreground hover:text-foreground"
        >
          {session.form.statement || 'Пусто. Нажмите, чтобы написать'}
        </button>
      </Block>
    );
  }

  return (
    <Block title="Условие">
      <StatementTextarea
        value={session.form.statement}
        disabled={readOnly}
        rows={long ? 14 : 5}
        onChange={(value) => session.setField('statement', value)}
      />
    </Block>
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
      aria-label="Условие"
      placeholder="Что сделать, как сдать, как будем проверять. Markdown"
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full resize-y rounded-lg border border-transparent bg-muted/50 px-3 py-2',
        'text-sm leading-6 outline-none focus-visible:border-ring',
        'focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
    />
  );
}

export function AttachmentsBlock({ session, readOnly }: FieldProps) {
  const attachments = session.form.attachments;

  return (
    <Block
      title="Вложения"
      aside={
        <Button
          variant="ghost"
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
      }
    >
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет файлов</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {attachments.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border pr-1 pl-2 text-sm"
            >
              <Paperclip className="size-3.5 text-muted-foreground" />
              <span className="max-w-48 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">{file.size}</span>
              <button
                type="button"
                aria-label={`Удалить ${file.name}`}
                disabled={readOnly}
                onClick={() =>
                  session.setField(
                    'attachments',
                    attachments.filter((_, item) => item !== index)
                  )
                }
                className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
