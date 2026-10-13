// PROTOTYPE (#181): how Task edits are applied — `?taskApply=course` (A,
// through the Course Draft Snapshot) or `?taskApply=task` (D, a Task
// publication with a version check). The schedule is always applied apart.
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  CalendarClock,
  Check,
  CircleAlert,
  CopyPlus,
  FileStack,
  GitCompareArrows,
  LoaderCircle,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { OTHER_TEACHER } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import { usePrototypeSettings } from '@/features/course/prototype/task-and-deadline-settings/search';
import {
  useSandbox,
  useViewSchedule,
} from '@/features/course/prototype/task-and-deadline-settings/store';
import {
  formatClock,
  formatMoment,
} from '@/features/course/prototype/task-and-deadline-settings/time';
import { usePendingChanges } from '@/features/course/prototype/task-and-deadline-settings/use-pending';
import { ChangesList } from '@/features/course/prototype/task-and-deadline-settings/ui/changes-list';
import {
  changedFields,
  editsOf,
  FIELD_LABEL,
  pickProps,
  type PanelSession,
} from './session';

function Note({
  tone = 'muted',
  icon,
  children,
}: {
  tone?: 'muted' | 'warn' | 'danger' | 'ok';
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-md px-3 py-2 text-xs leading-5',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'warn' && 'bg-amber-500/10 text-amber-900 dark:text-amber-200',
        tone === 'danger' && 'bg-red-500/10 text-red-800 dark:text-red-200',
        tone === 'ok' &&
          'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="grid min-w-0 gap-1">{children}</div>
    </div>
  );
}

export function PublishFooter({
  session,
  hasErrors,
  onAttempt,
  onCreateAnother,
}: {
  session: PanelSession;
  hasErrors: boolean;
  onAttempt: () => void;
  onCreateAnother?: () => void;
}) {
  const { taskApply, apply } = usePrototypeSettings();
  const sandbox = useSandbox();
  const view = useViewSchedule();
  const { changes } = usePendingChanges();
  const [busy, setBusy] = useState(false);

  const fields = changedFields(session.base, session.form);
  const dirty = fields.length > 0;
  const scheduleChanges = changes.filter(
    (change) => change.taskId === session.taskId
  );
  const scheduleDirty = apply === 'batch' && scheduleChanges.length > 0;
  const isNew = sandbox.newTaskIds.includes(session.taskId);

  async function applySchedule() {
    if (!scheduleDirty) {
      return true;
    }

    return sandbox.applyPending(session.taskId);
  }

  function guard() {
    onAttempt();
    if (hasErrors) {
      toast.error('Исправьте ошибки в полях Task');
      return false;
    }
    return true;
  }

  const fieldList = fields.map((key) => FIELD_LABEL[key]).join(', ');

  const scheduleBox = scheduleDirty ? (
    <div className="rounded-md border border-amber-500/40">
      <p className="flex items-center gap-1.5 border-b border-amber-500/30 px-3 py-1.5 text-xs font-medium">
        <CalendarClock className="size-3.5" />
        Сроки применяются отдельно от публикации (#42)
      </p>
      <ChangesList
        changes={scheduleChanges}
        before={sandbox.schedule}
        after={view}
      />
    </div>
  ) : null;

  const result =
    session.result.kind === 'applied' ? (
      <Note tone="ok" icon={<Check className="size-3.5" />}>
        Применено в {formatClock(session.result.at)}: {session.result.text}
      </Note>
    ) : session.result.kind === 'draft' ? (
      <Note tone="ok" icon={<FileStack className="size-3.5" />}>
        В черновике курса с {formatClock(session.result.at)}. Опубликуется
        вместе с курсом.
      </Note>
    ) : null;

  // ---------------------------------------------------------------- A
  if (taskApply === 'course') {
    const leaseOther = sandbox.lease.holder === 'other';

    if (leaseOther) {
      return (
        <FooterShell>
          <Note tone="warn" icon={<CircleAlert className="size-3.5" />}>
            Правка Task идёт через черновик курса, а его сейчас редактирует{' '}
            {OTHER_TEACHER.shortName}. Панель только для чтения, пока он не
            отпустит Course Editing Lease.
          </Note>
          {scheduleBox}
          {scheduleDirty ? (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await applySchedule();
                setBusy(false);
              }}
            >
              Применить сроки
            </Button>
          ) : null}
        </FooterShell>
      );
    }

    async function writeToDraft() {
      if (!guard()) {
        return;
      }

      if (dirty && isNew) {
        sandbox.saveNewTask(session.taskId, session.form);
        session.rebase(session.form, session.baseVersion);
      } else if (dirty) {
        sandbox.writeTaskToDraft(
          session.taskId,
          editsOf(session.base, session.form)
        );
        session.rebase(session.form, session.baseVersion);
      }

      setBusy(true);
      const ok = await applySchedule();
      setBusy(false);
      session.setResult({ kind: 'draft', at: Date.now() });
      if (ok && scheduleDirty) {
        toast.success('Сроки применены отдельно от черновика');
      }
    }

    if (session.context === 'edit') {
      return (
        <FooterShell>
          {result}
          <Note icon={<FileStack className="size-3.5" />}>
            Правки Task попадут в ваш черновик курса и опубликуются общей
            кнопкой «Применить» редактора вместе со страницей.
          </Note>
          {scheduleBox}
          <Buttons>
            {onCreateAnother ? (
              <Button variant="outline" onClick={onCreateAnother}>
                <CopyPlus /> Создать ещё
              </Button>
            ) : null}
            <Button
              disabled={busy || (!dirty && !scheduleDirty)}
              onClick={writeToDraft}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : null}
              {scheduleDirty
                ? dirty
                  ? 'В черновик и применить сроки'
                  : 'Применить сроки'
                : 'В черновик'}
            </Button>
          </Buttons>
        </FooterShell>
      );
    }

    const draft = sandbox.draft;
    const otherTaskEdits = Object.entries(draft?.taskEdits ?? {}).filter(
      ([taskId]) => taskId !== session.taskId
    );
    const alsoPublished = [
      ...(draft?.pageEdits ?? []),
      ...otherTaskEdits.map(
        ([taskId, edits]) =>
          `Task «${sandbox.tasks[taskId]?.title}»: ${Object.keys(edits)
            .map((key) => FIELD_LABEL[key as keyof typeof FIELD_LABEL])
            .join(', ')}`
      ),
    ];
    const ownDraftEdits = draft?.taskEdits[session.taskId];
    const somethingToPublish =
      dirty || Boolean(ownDraftEdits) || alsoPublished.length > 0;

    async function publish() {
      if (!guard()) {
        return;
      }

      if (dirty) {
        sandbox.writeTaskToDraft(
          session.taskId,
          editsOf(session.base, session.form)
        );
      }

      setBusy(true);
      if (somethingToPublish) {
        await sandbox.publishCourse();
      }
      const scheduleOk = await applySchedule();
      setBusy(false);

      const task = useSandbox.getState().tasks[session.taskId]!;
      session.rebase(pickProps(task), task.version);
      session.setResult({
        kind: 'applied',
        at: Date.now(),
        text: [
          somethingToPublish
            ? `опубликован курс целиком${alsoPublished.length ? ` (+${alsoPublished.length} других правок)` : ''}`
            : null,
          scheduleDirty
            ? scheduleOk
              ? 'сроки применены отдельно'
              : 'сроки не применены'
            : null,
        ]
          .filter(Boolean)
          .join('; '),
      });
      toast.success(
        somethingToPublish ? 'Курс опубликован' : 'Сроки применены'
      );
    }

    return (
      <FooterShell>
        {result}
        {draft?.stale ? (
          <Note tone="danger" icon={<GitCompareArrows className="size-3.5" />}>
            <p>
              Ваш черновик устарел: {OTHER_TEACHER.shortName} опубликовал курс в
              11:05. Правка Task попадёт в устаревший черновик; опубликовать его
              можно только после пересборки на новой версии.
            </p>
            <div>
              <Button
                size="xs"
                variant="outline"
                onClick={() => sandbox.rebaseDraft()}
              >
                Пересобрать черновик
              </Button>
            </div>
          </Note>
        ) : null}
        {somethingToPublish ? (
          <div className="rounded-md border border-border">
            <p className="border-b px-3 py-1.5 text-xs font-medium">
              Опубликуется весь черновик курса
            </p>
            <ul className="grid gap-0.5 px-3 py-2 text-xs">
              {dirty || ownDraftEdits ? (
                <li>
                  <b>Эта Task:</b>{' '}
                  {[
                    ...new Set([
                      ...fields,
                      ...(Object.keys(ownDraftEdits ?? {}) as typeof fields),
                    ]),
                  ]
                    .map((key) => FIELD_LABEL[key])
                    .join(', ')}
                </li>
              ) : null}
              {alsoPublished.map((item) => (
                <li key={item} className="text-amber-800 dark:text-amber-300">
                  + {item}
                </li>
              ))}
            </ul>
            <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              {sandbox.lease.holder === 'me'
                ? 'Course Editing Lease у вас.'
                : 'Возьмёт Course Editing Lease на время правки.'}{' '}
              Студенты увидят всё сразу после публикации.
            </p>
          </div>
        ) : null}
        {scheduleBox}
        <Buttons>
          <Button
            variant="outline"
            disabled={busy || !dirty}
            onClick={writeToDraft}
          >
            Сохранить в черновик
          </Button>
          <Button
            disabled={
              busy ||
              Boolean(draft?.stale) ||
              (!somethingToPublish && !scheduleDirty)
            }
            onClick={publish}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            {somethingToPublish && scheduleDirty
              ? 'Опубликовать курс и применить сроки'
              : !somethingToPublish && scheduleDirty
                ? 'Применить сроки'
                : 'Опубликовать курс'}
          </Button>
        </Buttons>
      </FooterShell>
    );
  }

  // ---------------------------------------------------------------- D
  const conflict = session.result.kind === 'conflict' ? session.result : null;
  const version = conflict ? conflict.theirs.version : session.baseVersion;

  async function publishTask(baseVersion: number) {
    if (!guard()) {
      return;
    }

    setBusy(true);
    const edits = editsOf(session.base, session.form);
    let published: number | null = null;

    if (dirty && isNew) {
      sandbox.saveNewTask(session.taskId, session.form);
    }

    if (dirty) {
      const outcome = await sandbox.publishTask(
        session.taskId,
        edits,
        baseVersion
      );

      if (outcome.status === 'conflict') {
        setBusy(false);
        session.setResult({
          kind: 'conflict',
          theirs: outcome.theirs,
          changedFields: outcome.changedFields,
        });
        return;
      }

      published = outcome.version;
    }

    const scheduleOk = await applySchedule();
    setBusy(false);

    const task = useSandbox.getState().tasks[session.taskId]!;
    session.rebase(pickProps(task), task.version);
    const parts = [
      published !== null
        ? `Task опубликована, версия ${published} (${fieldList})`
        : null,
      scheduleDirty
        ? scheduleOk
          ? 'сроки применены'
          : 'сроки не применены'
        : null,
    ].filter(Boolean);
    session.setResult({
      kind: 'applied',
      at: Date.now(),
      text: parts.join('; '),
    });
    toast.success(published !== null ? 'Task опубликована' : 'Сроки применены');
  }

  return (
    <FooterShell>
      {result}
      {conflict ? (
        <Note tone="danger" icon={<GitCompareArrows className="size-3.5" />}>
          <p>
            <b>Конфликт версий.</b> {OTHER_TEACHER.shortName} опубликовал эту
            Task, пока вы её правили: версия {session.baseVersion} →{' '}
            {conflict.theirs.version}. У него изменены:{' '}
            {conflict.changedFields.map((key) => FIELD_LABEL[key]).join(', ')}.
          </p>
          <p className="rounded bg-background/70 px-2 py-1 whitespace-pre-line text-foreground">
            …{conflict.theirs.statement.slice(-90)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                session.rebase(
                  pickProps(conflict.theirs),
                  conflict.theirs.version
                );
                session.setResult({ kind: 'none' });
              }}
            >
              Взять его версию, мои правки отбросить
            </Button>
            <Button
              size="xs"
              onClick={() => void publishTask(conflict.theirs.version)}
            >
              Опубликовать мои поверх
            </Button>
          </div>
        </Note>
      ) : null}
      {sandbox.lease.holder === 'other' ? (
        <Note>
          Курс редактирует {OTHER_TEACHER.shortName}, но Task публикуется
          отдельно от черновика курса — правка доступна.
        </Note>
      ) : null}
      {sandbox.draft ? (
        <Note>
          Ваш черновик курса не затрагивается: Task публикуется отдельно
          {sandbox.draft.stale ? ', даже если черновик устарел' : ''}.
        </Note>
      ) : null}
      {dirty && scheduleDirty ? (
        <Note icon={<CalendarClock className="size-3.5" />}>
          <p>Две отдельные операции за одной кнопкой:</p>
          <ol className="list-decimal pl-4">
            <li>
              публикация Task: версия {version} → {version + 1} ({fieldList});
            </li>
            <li>применение сроков: {scheduleChanges.length} правок.</li>
          </ol>
        </Note>
      ) : dirty ? (
        <Note>
          Опубликуется только эта Task: {fieldList}. Версия {version} →{' '}
          {version + 1}.
        </Note>
      ) : null}
      {scheduleBox}
      <Buttons>
        {onCreateAnother ? (
          <Button variant="outline" onClick={onCreateAnother}>
            <CopyPlus /> Создать ещё
          </Button>
        ) : null}
        <Button
          disabled={busy || (!dirty && !scheduleDirty) || Boolean(conflict)}
          onClick={() => void publishTask(session.baseVersion)}
        >
          {busy ? <LoaderCircle className="animate-spin" /> : null}
          {dirty
            ? scheduleDirty
              ? 'Опубликовать Task и сроки'
              : isNew
                ? 'Создать Task'
                : 'Опубликовать Task'
            : 'Применить сроки'}
        </Button>
      </Buttons>
      <p className="text-[11px] text-muted-foreground">
        Последняя публикация Task — версия {session.baseVersion}
        {sandbox.lastApplied?.taskIds.includes(session.taskId)
          ? `, ${formatMoment(sandbox.lastApplied.at)}`
          : ''}
        .
      </p>
    </FooterShell>
  );
}

function FooterShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid max-h-[55%] shrink-0 gap-2 overflow-y-auto border-t border-border bg-background px-5 py-3 max-md:pb-16">
      {children}
    </div>
  );
}

function Buttons({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}
