import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MutableRefObject,
} from 'react';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import { getLineCommentStatus } from '@/features/course/features/attempt-review/model/comment-lifecycle';
import {
  getAttemptReviewFileStatusLabel,
  getAttemptReviewFileStatusShortGlyph,
} from '@/features/course/features/attempt-review/model/file-status';
import { useHtmlThemeType } from '@/features/course/features/attempt-review/hooks/use-html-theme';
import type {
  AttemptReviewChangedFile,
  AttemptReviewLineComment,
} from '@/features/course/features/attempt-review/model/types';

type AttemptReviewFileTreeProps = {
  files: AttemptReviewChangedFile[];
  comments: AttemptReviewLineComment[];
  activeFilePath: string | null;
  className?: string;
  collapsed?: boolean;
  showHeader?: boolean;
  onSelectFile: (path: string) => void;
  onToggleCollapsed?: () => void;
};

export function AttemptReviewFileTree({
  files,
  comments,
  activeFilePath,
  className,
  collapsed = false,
  showHeader = true,
  onSelectFile,
  onToggleCollapsed,
}: AttemptReviewFileTreeProps) {
  const htmlThemeType = useHtmlThemeType();
  const statsByPath = useMemo(
    () => new Map(files.map((file) => [file.path, file])),
    [files]
  );
  const commentStatsByPath = useMemo(
    () => groupCommentStatsByFile(comments),
    [comments]
  );
  const statsByPathRef = useRef(statsByPath);
  const commentStatsByPathRef = useRef(commentStatsByPath);
  const isSyncingSelectionRef = useRef(false);
  const paths = useMemo(() => files.map((file) => file.path), [files]);
  const { model } = useFileTree({
    paths,
    flattenEmptyDirectories: true,
    initialExpansion: 'open',
    initialSelectedPaths: activeFilePath ? [activeFilePath] : [],
    search: true,
    itemHeight: 30,
    onSelectionChange: (selectedPaths) => {
      if (isSyncingSelectionRef.current) {
        return;
      }

      const selected = selectedPaths.at(-1);

      if (selected) {
        onSelectFile(selected);
      }
    },
    renderRowDecoration: ({ item }) => {
      const file = statsByPathRef.current.get(item.path);

      if (!file) {
        return null;
      }

      const commentStats = commentStatsByPathRef.current.get(item.path);
      const commentCount = commentStats?.visibleCount ?? 0;
      const unsavedCommentCount = commentStats?.unsavedCount ?? 0;
      const titleParts = [
        `${getAttemptReviewFileStatusLabel(file.status)}: +${file.addedLines}, −${file.deletedLines}`,
      ];

      if (commentCount > 0) {
        titleParts.push(`Комментариев: ${commentCount}`);
      }

      if (unsavedCommentCount > 0) {
        titleParts.push(`Несохранённых комментариев: ${unsavedCommentCount}`);
      }

      const title = titleParts.join('. ');

      return {
        text: `${getAttemptReviewFileStatusShortGlyph(file.status)} +${file.addedLines}/−${file.deletedLines}`,
        title,
      };
    },
    unsafeCSS: `
      :host { --trees-selected-bg-override: color-mix(in oklch, var(--primary, #111) 12%, transparent); }
      button[data-type='item'] { border-radius: 10px; }
      [data-file-tree-virtualized-scroll] {
        touch-action: pan-y;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      [data-item-section='decoration'] {
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      [data-item-section='decoration'] > span[title*='Комментариев'],
      [data-item-section='decoration'] > span[title*='Несохранённых'] {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }
      [data-item-section='decoration'] > span[title*='Комментариев']::before,
      [data-item-section='decoration'] > span[title*='Несохранённых']::before {
        content: '';
        width: 0.875rem;
        height: 0.875rem;
        flex: none;
        background: var(--primary);
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
      }
      [data-item-section='decoration'] > span[title*='Несохранённых']::before {
        background: #f59e0b;
      }
      :host-context(.dark) [data-item-section='decoration'] > span[title*='Несохранённых']::before {
        background: #fbbf24;
      }
    `,
  });

  useEffect(() => {
    statsByPathRef.current = statsByPath;
    commentStatsByPathRef.current = commentStatsByPath;

    if (model.getFileTreeContainer()) {
      model.render({});
    }
  }, [commentStatsByPath, model, statsByPath]);

  useEffect(() => {
    model.resetPaths(paths);
  }, [model, paths]);

  useEffect(() => {
    if (!activeFilePath || !paths.includes(activeFilePath)) {
      return;
    }

    selectOnlyFileTreePath(model, activeFilePath, isSyncingSelectionRef);
    model.scrollToPath(activeFilePath, { focus: false, offset: 'center' });
  }, [activeFilePath, model, paths]);

  if (files.length === 0) {
    return (
      <p
        className={cn(
          'rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground'
        )}
      >
        Нет изменённых файлов.
      </p>
    );
  }

  return (
    <div
      className={cn(
        'flex h-80 flex-col overflow-hidden border-b bg-card lg:h-full lg:border-r lg:border-b-0',
        collapsed && 'h-12',
        className
      )}
    >
      {showHeader ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5',
            collapsed && 'justify-center border-b-0 px-1.5 py-2'
          )}
        >
          {collapsed ? null : (
            <h2 className="min-w-0 truncate text-sm font-semibold">
              Изменённые файлы
            </h2>
          )}
          {onToggleCollapsed ? (
            <button
              type="button"
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-lg',
                'text-muted-foreground transition-colors hover:bg-muted',
                'hover:text-foreground focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:outline-none'
              )}
              aria-label={
                collapsed
                  ? 'Показать список изменённых файлов'
                  : 'Скрыть список изменённых файлов'
              }
              title={
                collapsed ? 'Показать список файлов' : 'Скрыть список файлов'
              }
              onClick={onToggleCollapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
      {collapsed ? null : (
        <FileTree
          model={model}
          className="attempt-review-file-tree min-h-0 flex-1 pt-2"
          style={{
            ...getFileTreeStyle(htmlThemeType),
            height: '100%',
          }}
        />
      )}
    </div>
  );
}

function selectOnlyFileTreePath(
  model: ReturnType<typeof useFileTree>['model'],
  path: string,
  isSyncingSelectionRef: MutableRefObject<boolean>
) {
  isSyncingSelectionRef.current = true;

  model.getSelectedPaths().forEach((selectedPath) => {
    if (selectedPath !== path) {
      model.getItem(selectedPath)?.deselect();
    }
  });

  model.getItem(path)?.select();

  window.requestAnimationFrame(() => {
    isSyncingSelectionRef.current = false;
  });
}

type FileCommentStats = {
  visibleCount: number;
  unsavedCount: number;
};

function groupCommentStatsByFile(comments: AttemptReviewLineComment[]) {
  const stats = new Map<string, FileCommentStats>();

  comments.forEach((comment) => {
    const current = stats.get(comment.filePath) ?? {
      visibleCount: 0,
      unsavedCount: 0,
    };
    const status = getLineCommentStatus(comment);

    if (status !== 'draft' && status !== 'pending-delete') {
      current.visibleCount += 1 + (comment.replies?.length ?? 0);
    }

    if (status !== 'saved') {
      current.unsavedCount += 1;
    }

    stats.set(comment.filePath, current);
  });

  return stats;
}

function getFileTreeStyle(colorScheme: 'light' | 'dark'): CSSProperties {
  return {
    width: '100%',
    touchAction: 'pan-y',
    colorScheme,
    backgroundColor: 'var(--card)',
    color: 'var(--card-foreground)',
    '--trees-bg-override': 'var(--card)',
    '--trees-fg-override': 'var(--card-foreground)',
    '--trees-fg-muted-override': 'var(--muted-foreground)',
    '--trees-bg-muted-override': 'var(--muted)',
    '--trees-border-color-override': 'var(--border)',
    '--trees-focus-ring-color-override': 'var(--ring)',
    '--trees-search-bg-override': 'var(--background)',
    '--trees-search-fg-override': 'var(--foreground)',
    '--trees-selected-bg-override':
      'color-mix(in oklch, var(--primary) 12%, transparent)',
  } as CSSProperties;
}
