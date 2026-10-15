// PROTOTYPE (#181): fields of the Task panel per #180 «Поля панели», laid
// out as a property list (Linear, Twenty, Asana): label on the left, the
// value edited in place. Task Group and masks are simplified but sized like
// the real ones (#190, #191 extend them).
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  GitBranch,
  GripVertical,
  Info,
  Maximize2,
  Paperclip,
  Plus,
  X,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { StatementEditor } from '@/features/course/prototype/task-and-deadline-settings/panel/statement/editor';
import type { TaskGroup } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import { overrideCounts } from '@/features/course/prototype/task-and-deadline-settings/schedule';
import {
  useOpenVariant,
  usePrototypeSettings,
} from '@/features/course/prototype/task-and-deadline-settings/search';
import { isExpandedStatement } from '@/features/course/prototype/task-and-deadline-settings/settings';
import {
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import { formatMoment } from '@/features/course/prototype/task-and-deadline-settings/time';
import { useScheduleEdit } from '@/features/course/prototype/task-and-deadline-settings/use-schedule-edit';
import {
  PropertyRow,
  VALUE_INDENT,
} from '@/features/course/prototype/task-and-deadline-settings/ui/property-row';
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

/** A panel section: divided by a line (`list`) or a card (`cards`). */
export function Block({
  title,
  aside,
  divided = true,
  children,
}: {
  title?: string;
  aside?: ReactNode;
  /** `list` only: the line above. Off right under the title. */
  divided?: boolean;
  children: ReactNode;
}) {
  const { panelLook } = usePrototypeSettings();

  if (panelLook === 'cards') {
    return (
      <section className="mx-3 rounded-lg border bg-muted/30">
        {title ? (
          <div className="flex h-10 items-center justify-between gap-2 border-b px-4">
            <h3 className="text-sm font-medium">{title}</h3>
            {aside}
          </div>
        ) : null}
        <div className="grid grid-cols-[minmax(0,1fr)] px-4 py-3">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'grid grid-cols-[minmax(0,1fr)] px-5 py-4',
        divided ? 'border-t' : 'pt-0'
      )}
    >
      {title ? (
        <div className="mb-1 flex h-8 items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Quiet action in a section header. */
function HeaderAction({ children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className="-mr-2 text-muted-foreground hover:text-foreground"
      {...props}
    >
      {children}
    </Button>
  );
}

export function TitleInput({ session, readOnly, errors }: FieldProps) {
  return (
    <div className="grid gap-1">
      <input
        value={session.form.title}
        disabled={readOnly}
        placeholder="Название задания"
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
          'h-auto w-full py-1 text-xl font-semibold tracking-tight'
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
      label="Ключ задания"
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
          aria-label="Ключ задания"
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
      <PropertyRow label="Группа заданий" locked={locked}>
        {locked ? (
          <span className="truncate text-sm">{group?.title}</span>
        ) : (
          <span className="relative -mx-2 inline-flex min-w-0">
            <select
              value={session.form.groupId}
              disabled={readOnly}
              aria-label="Группа заданий"
              onChange={(event) =>
                session.setField('groupId', event.target.value)
              }
              className={cn(
                GHOST_INPUT,
                'mx-0 cursor-pointer appearance-none pr-7'
              )}
            >
              {taskGroups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </span>
        )}
        <button
          type="button"
          aria-expanded={open}
          title={open ? 'Скрыть сведения о группе' : 'О группе'}
          onClick={() => setOpen(!open)}
          className={cn(
            'ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            open && 'bg-muted text-foreground'
          )}
        >
          <Info className="size-3.5" aria-hidden="true" />О группе
        </button>
      </PropertyRow>
      {open && group ? (
        <GroupSection
          key={group.id}
          group={group}
          currentTaskId={session.taskId}
          taskTitle={(taskId) =>
            taskId === session.taskId
              ? session.form.title || 'Новое задание'
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
    <div
      className={cn(
        VALUE_INDENT,
        'my-1 grid gap-2 rounded-lg bg-muted/50 p-3 text-sm'
      )}
    >
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
            ? 'Шаблон пуст: студенты получат пустой репозиторий'
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
    <PropertyRow label="Макс. балл" locked={locked} error={errors.maxGrade}>
      {locked ? (
        <span className="text-sm tabular-nums">{session.form.maxGrade}</span>
      ) : (
        <input
          type="number"
          min={1}
          value={session.form.maxGrade ?? ''}
          disabled={readOnly}
          placeholder="Нет"
          aria-label="Максимальный балл"
          aria-invalid={Boolean(errors.maxGrade)}
          onChange={(event) =>
            session.setField(
              'maxGrade',
              event.target.value === '' ? null : Number(event.target.value)
            )
          }
          className={cn(
            GHOST_INPUT,
            'w-24 [appearance:textfield] tabular-nums',
            '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
          )}
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
      <div className="flex min-w-0 flex-wrap items-center gap-1 py-0.5">
        {patterns.length === 0 ? (
          <span className="text-sm text-muted-foreground">Любые файлы</span>
        ) : null}
        {patterns.map((pattern, index) => (
          <span
            key={index}
            className="inline-flex h-7 items-center rounded-md bg-muted pl-2"
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
          size="icon-sm"
          aria-label="Добавить маску"
          className="size-7 text-muted-foreground"
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
        placeholder="Видна студентам даже у закрытого задания"
        aria-label="Аннотация задания"
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
  const label = session.form.title || 'Новое задание';
  const counts = overrideCounts(schedule, taskId);

  // With every override in the panel, opening and deadline move to the
  // «Дедлайны» section next to them.
  if (!schedule.tasks[taskId] || deadlineField === 'full') {
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
      title="Дедлайны"
      aside={
        <HeaderAction onClick={() => openVariant('A', { task: taskId })}>
          Страница дедлайнов <ArrowUpRight />
        </HeaderAction>
      }
    >
      <TaskScheduleEditor
        taskId={taskId}
        taskTitle={session.form.title || 'Новое задание'}
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
          <HeaderAction onClick={onRevealInDocument}>
            Править в документе <ArrowUpRight />
          </HeaderAction>
        }
      >
        <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
          {session.form.statement || 'Пусто'}
        </p>
      </Block>
    );
  }

  if (isExpandedStatement(statement)) {
    // The expanded layout puts the editor in its own column.
    return session.expanded ? null : (
      <Block
        title="Условие"
        aside={
          <HeaderAction onClick={() => session.setExpanded(true)}>
            <Maximize2 /> Развернуть
          </HeaderAction>
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
      <StatementEditor
        value={session.form.statement}
        disabled={readOnly}
        contentClassName={long ? 'min-h-80' : undefined}
        onChange={(value) => session.setField('statement', value)}
      />
    </Block>
  );
}

export function AttachmentsBlock({ session, readOnly }: FieldProps) {
  const attachments = session.form.attachments;

  return (
    <Block
      title="Вложения"
      aside={
        <HeaderAction
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
        </HeaderAction>
      }
    >
      {attachments.length === 0 ? (
        <p className="flex min-h-8 items-center text-sm text-muted-foreground">
          Нет файлов
        </p>
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
