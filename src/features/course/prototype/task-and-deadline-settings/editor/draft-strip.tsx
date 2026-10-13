// PROTOTYPE (#181): `?taskApply=contract` in the Course Page editor. The
// working copy is the Course Draft Snapshot; this strip says what «Применить»
// will do to Tasks before it does it.
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, CircleAlert, FileStack } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import { useCoursePageEditStore } from '@/features/course/features/page-edit/hooks/use-editor-store';
import {
  draftTaskChanges,
  hasTaskChanges,
  missingForPublish,
  pageTaskIdsOf,
  quoteTitles,
} from '@/features/course/prototype/task-and-deadline-settings/contract';
import { useSandbox } from '@/features/course/prototype/task-and-deadline-settings/store';

/** Keeps the sandbox aware of the Task References in the working copy. */
export function PageTaskSync() {
  const content = useCoursePageEditStore((state) => state.workingCopy.content);
  const setPageTaskIds = useSandbox((state) => state.setPageTaskIds);
  const key = pageTaskIdsOf(content).join('|');

  useEffect(() => {
    setPageTaskIds(key ? key.split('|') : []);
  }, [key, setPageTaskIds]);

  useEffect(() => () => setPageTaskIds(null), [setPageTaskIds]);

  return null;
}

/** What «Применить» of the editor will do to Tasks, before it does it. */
export function ContractDraftStrip() {
  const pageTaskIds = useSandbox((state) => state.pageTaskIds);
  const tasks = useSandbox((state) => state.tasks);
  const taskGroups = useSandbox((state) => state.taskGroups);
  const newTaskIds = useSandbox((state) => state.newTaskIds);
  const removedTaskIds = useSandbox((state) => state.removedTaskIds);
  const courseAccess = useSandbox((state) => state.courseAccess);
  const [open, setOpen] = useState(false);

  const changes = useMemo(
    () =>
      pageTaskIds
        ? draftTaskChanges(
            { tasks, taskGroups, newTaskIds, removedTaskIds },
            pageTaskIds
          )
        : null,
    [newTaskIds, pageTaskIds, removedTaskIds, taskGroups, tasks]
  );

  if (!changes || !hasTaskChanges(changes)) {
    return null;
  }

  const blocked = courseAccess === 'open' && changes.deleted.length > 0;
  const unfinished = changes.created.filter(
    (task) => missingForPublish(task, { tasks, taskGroups }).length > 0
  );
  const counts = [
    changes.created.length ? `создадутся ${changes.created.length}` : null,
    changes.deleted.length ? `удалятся ${changes.deleted.length}` : null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'pointer-events-auto grid w-full gap-1.5 rounded-xl border bg-background px-4 py-2.5',
        'text-sm shadow-lg'
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-left"
      >
        <FileStack className="size-4 shrink-0 text-violet-600" />
        <span className="min-w-0 flex-1">
          <span className="font-medium">
            Задания в черновике{counts.length ? `: ${counts.join(', ')}` : ''}
          </span>
          <span className="text-muted-foreground">
            {' '}
            — опубликует «Применить», одной операцией со страницей
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? (
        <ul className="grid gap-0.5 pl-6 text-muted-foreground">
          {changes.created.length > 0 ? (
            <li>
              <span className="text-foreground">Создадутся</span>{' '}
              {quoteTitles(changes.created)} — со свойствами и дедлайнами из
              черновика
            </li>
          ) : null}
          {changes.deleted.length > 0 ? (
            <li>
              <span className="text-foreground">Удалятся</span>{' '}
              {quoteTitles(changes.deleted)}. До публикации Ctrl+Z вернёт то же
              задание
            </li>
          ) : null}
          {changes.groupsCreated.length > 0 ? (
            <li>Новые группы заданий: {quoteTitles(changes.groupsCreated)}</li>
          ) : null}
          {changes.groupsRemoved.length > 0 ? (
            <li>
              Исчезнут опустевшие группы: {quoteTitles(changes.groupsRemoved)}
            </li>
          ) : null}
          <li>
            Правки опубликованных заданий сюда не попадают: они публикуются из
            панели задания отдельно.
          </li>
        </ul>
      ) : null}
      {changes.duplicated.length > 0 ? (
        <p className="flex gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {quoteTitles(changes.duplicated)} стоит на странице дважды. Копию
          блока задания вставить нельзя: уберите лишний блок.
        </p>
      ) : null}
      {changes.unavailable.length > 0 ? (
        <p className="flex gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          На странице блок удалённого задания: уберите его.
        </p>
      ) : null}
      {blocked ? (
        <p className="flex gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          Курс открыт: задания не удаляются, блок задания можно только
          перемещать. Верните его — Ctrl+Z.
        </p>
      ) : null}
      {unfinished.length > 0 ? (
        <p className="flex gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          Не готово к публикации: {quoteTitles(unfinished)}. В черновике задание
          может быть незаконченным.
        </p>
      ) : null}
    </div>
  );
}
