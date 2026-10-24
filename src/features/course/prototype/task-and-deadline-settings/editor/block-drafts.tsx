// PROTOTYPE (#181): `taskApply: blocks` in the Course Page editor. Every
// edited block is the Teacher's own draft of that block, saved by itself and
// seen only by him; «Применить» publishes them all, merged block by block
// with what others published meanwhile (mm-backend PR #187).
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FileStack,
  GitCompareArrows,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import {
  useCoursePageEditStore,
  useCoursePageEditStoreApi,
} from '@/features/course/features/page-edit/hooks/use-editor-store';
import { getCoursePageEditWorkingCopyState } from '@/features/course/features/page-edit/model/editor-store/working-copy';
import type { CourseContentBlockItem } from '@/features/course/features/page/model/types';
import {
  blockText,
  type BlockConflict,
  type BlockDraft,
} from '@/features/course/prototype/task-and-deadline-settings/blocks';
import { OTHER_TEACHER } from '@/features/course/prototype/task-and-deadline-settings/fixture';
import {
  useBlockDraftView,
  useSandbox,
} from '@/features/course/prototype/task-and-deadline-settings/store';

/**
 * Keeps the sandbox and the editor in step: the working copy is the draft,
 * so it goes to the sandbox on every change, and a draft the sandbox
 * replaces (on mount, scenario 3, «Взять его версию») goes into the editor.
 */
export function BlockDraftSync() {
  const store = useCoursePageEditStoreApi();
  const published = useCoursePageEditStore(
    (state) => state.initialCourse.content
  );
  const working = useCoursePageEditStore((state) => state.workingCopy.content);
  const revision = useSandbox((state) => state.draftPageRevision);
  const syncPage = useSandbox((state) => state.syncPage);
  const loadedRevision = useRef<number | null>(null);
  const skipSync = useRef(false);

  useEffect(() => {
    if (loadedRevision.current === revision) {
      return;
    }

    const mounting = loadedRevision.current === null;
    loadedRevision.current = revision;
    const { draftPage, basePage } = useSandbox.getState();

    if (mounting && !draftPage) {
      return;
    }

    skipSync.current = true;
    loadContent(store, draftPage ?? basePage);
  }, [revision, store]);

  useEffect(() => {
    // The commit that loads a draft still holds the old working copy.
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }

    syncPage(published, working);
  }, [published, syncPage, working]);

  return null;
}

function loadContent(
  store: ReturnType<typeof useCoursePageEditStoreApi>,
  content: CourseContentBlockItem[]
) {
  store.setState((state) => ({
    ...getCoursePageEditWorkingCopyState(state.initialCourse, {
      ...state.workingCopy,
      content: structuredClone(content),
    }),
    contentEditorReset: {
      initialContent: structuredClone(content),
      revision: state.contentEditorReset.revision + 1,
    },
  }));
}

function draftKind(draft: BlockDraft) {
  switch (draft.kind) {
    case 'created':
      return 'новый';
    case 'deleted':
      return 'удалён';
    case 'edited':
      return editedKind(draft.change, draft.taskId !== null);
  }
}

function editedKind(change: 'data' | 'position' | 'both', isTask: boolean) {
  const data = isTask ? 'настройки задания' : 'изменён';

  switch (change) {
    case 'data':
      return data;
    case 'position':
      return 'перемещён';
    case 'both':
      return `${data}, перемещён`;
  }
}

/** A mark on a top-level block of the editor that is in the draft. */
export function BlockMark({ blockId }: { blockId: string }) {
  const { drafts, conflicts } = useBlockDraftView();
  const conflict = conflicts.some((item) => item.blockId === blockId);
  const draft = drafts.find((item) => item.blockId === blockId);

  if (!conflict && !draft) {
    return null;
  }

  return (
    <div
      contentEditable={false}
      className="pointer-events-none absolute inset-y-0 -left-2 z-10 select-none"
    >
      <div
        className={cn(
          'absolute inset-y-1 left-0 w-0.5 rounded-full',
          conflict ? 'bg-red-500' : 'bg-violet-500'
        )}
      />
      <span
        className={cn(
          'absolute -top-2 left-1.5 rounded-full px-1.5 py-px text-[10px] leading-4 whitespace-nowrap',
          conflict
            ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200'
            : 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200'
        )}
      >
        {conflict ? 'конфликт' : `черновик · ${draftKind(draft!)}`}
      </span>
    </div>
  );
}

function scrollToBlock(blockId: string) {
  document
    .querySelector(`[data-course-page-block-id="${blockId}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** The Teacher's block drafts and, after a failed «Применить», conflicts. */
export function BlockDraftStrip() {
  const { drafts, conflicts } = useBlockDraftView();
  const headPage = useSandbox((state) => state.headPage);
  const [open, setOpen] = useState(false);

  if (drafts.length === 0 && conflicts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-auto grid max-h-[60vh] w-full gap-1.5 overflow-y-auto',
        'rounded-xl border bg-background px-4 py-2.5 text-sm shadow-lg'
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
            Мои черновики блоков: {drafts.length}
          </span>
          <span className="text-muted-foreground">
            {' '}
            — сохраняются сами, видны только вам; «Применить» опубликует все
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
        <div className="grid gap-1.5 pl-6 text-muted-foreground">
          <ul className="grid gap-0.5">
            {drafts.map((draft) => (
              <li key={draft.blockId}>
                <button
                  type="button"
                  disabled={draft.kind === 'deleted'}
                  onClick={() => scrollToBlock(draft.blockId)}
                  className="text-left hover:text-foreground disabled:hover:text-muted-foreground"
                >
                  <span className="text-foreground">{draft.label}</span> —{' '}
                  {draftKind(draft)}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs">
            Блокировки курса нет: {OTHER_TEACHER.shortName} может в это же время
            править этот курс, и его черновики вы не видите. Пересечения
            выяснятся при публикации: правки разных блоков и перемещение против
            правки текста сливаются сами, конфликт — только когда текст одного
            блока изменили оба или один удалил блок, который правил другой.
          </p>
        </div>
      ) : null}
      {conflicts.length > 0 ? <ConflictList conflicts={conflicts} /> : null}
      {headPage && conflicts.length === 0 ? (
        <p className="flex gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          <CircleCheck className="mt-0.5 size-3.5 shrink-0" />
          Конфликты решены. Нажмите «Применить» ещё раз: остальные правки{' '}
          {OTHER_TEACHER.shortName} сольются с вашими сами.
        </p>
      ) : null}
    </div>
  );
}

function conflictReason(reason: BlockConflict['reason']) {
  switch (reason) {
    case 'both-edited':
      return `${OTHER_TEACHER.shortName} тоже изменил этот блок и опубликовал раньше`;
    case 'deleted-by-them':
      return `${OTHER_TEACHER.shortName} удалил этот блок, а вы его правили`;
    case 'deleted-by-me':
      return `вы удалили этот блок, а ${OTHER_TEACHER.shortName} его изменил`;
  }
}

function ConflictList({ conflicts }: { conflicts: BlockConflict[] }) {
  const keepMyBlock = useSandbox((state) => state.keepMyBlock);
  const takeTheirBlock = useSandbox((state) => state.takeTheirBlock);

  return (
    <div className="grid gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
      <p className="flex gap-2">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <b>Курс не опубликован.</b> Ничего не ушло студентам: публикация
          проходит целиком или никак. Решите, чья версия остаётся в{' '}
          {conflicts.length === 1 ? 'этом блоке' : 'этих блоках'}.
        </span>
      </p>
      {conflicts.map((item) => (
        <div
          key={item.blockId}
          className="grid gap-1.5 rounded-md bg-background/70 px-2.5 py-2 text-foreground"
        >
          <div className="flex items-start gap-2">
            <GitCompareArrows className="mt-0.5 size-3.5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => scrollToBlock(item.blockId)}
                className="text-left font-medium hover:underline"
              >
                {item.label}
              </button>
              <p className="text-muted-foreground">
                {conflictReason(item.reason)}
              </p>
            </div>
          </div>
          {item.theirs ? (
            <p className="rounded bg-muted px-2 py-1 text-muted-foreground">
              Его версия: {blockText(item.theirs) || 'без текста'}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => takeTheirBlock(item.blockId)}
            >
              {takeLabel(item.reason)}
            </Button>
            <Button size="xs" onClick={() => keepMyBlock(item.blockId)}>
              {keepLabel(item.reason)}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function takeLabel(reason: BlockConflict['reason']) {
  switch (reason) {
    case 'both-edited':
      return 'Взять его версию';
    case 'deleted-by-them':
      return 'Согласиться с удалением';
    case 'deleted-by-me':
      return 'Вернуть блок с его правкой';
  }
}

function keepLabel(reason: BlockConflict['reason']) {
  switch (reason) {
    case 'both-edited':
      return 'Оставить мою поверх';
    case 'deleted-by-them':
      return 'Оставить блок с моей правкой';
    case 'deleted-by-me':
      return 'Всё равно удалить';
  }
}
