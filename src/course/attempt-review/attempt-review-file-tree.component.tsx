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
import {
  getAttemptReviewFileStatusLabel,
  getAttemptReviewFileStatusShortGlyph,
} from './attempt-review-file-status.format';
import { useHtmlThemeType } from './attempt-review-theme';
import type {
  AttemptReviewChangedFile,
  AttemptReviewLineComment,
} from './attempt-review.types';

interface AttemptReviewFileTreeProps {
  files: AttemptReviewChangedFile[];
  comments: AttemptReviewLineComment[];
  activeFilePath: string | null;
  className?: string;
  collapsed?: boolean;
  onSelectFile: (path: string) => void;
  onToggleCollapsed?: () => void;
}

export function AttemptReviewFileTree({
  files,
  comments,
  activeFilePath,
  className,
  collapsed = false,
  onSelectFile,
  onToggleCollapsed,
}: AttemptReviewFileTreeProps) {
  const htmlThemeType = useHtmlThemeType();
  const statsByPath = useMemo(
    () => new Map(files.map((file) => [file.path, file])),
    [files]
  );
  const commentCountByPath = useMemo(
    () => groupCommentCountsByFile(comments),
    [comments]
  );
  const statsByPathRef = useRef(statsByPath);
  const commentCountByPathRef = useRef(commentCountByPath);
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

      const commentCount = commentCountByPathRef.current.get(item.path) ?? 0;
      const title =
        commentCount > 0
          ? `${getAttemptReviewFileStatusLabel(file.status)}: +${file.addedLines}, −${file.deletedLines}. Комментариев: ${commentCount}`
          : `${getAttemptReviewFileStatusLabel(file.status)}: +${file.addedLines}, −${file.deletedLines}`;

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
      [data-item-section='decoration'] > span[title*='Комментариев'] {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }
      [data-item-section='decoration'] > span[title*='Комментариев']::before {
        content: '';
        width: 0.875rem;
        height: 0.875rem;
        flex: none;
        background: var(--primary);
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
      }
    `,
  });

  useEffect(() => {
    statsByPathRef.current = statsByPath;
    commentCountByPathRef.current = commentCountByPath;

    if (model.getFileTreeContainer()) {
      model.render({});
    }
  }, [commentCountByPath, model, statsByPath]);

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
      <p className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
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
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

function groupCommentCountsByFile(comments: AttemptReviewLineComment[]) {
  const counts = new Map<string, number>();

  comments.forEach((comment) => {
    if (comment.status === 'draft' || comment.status === 'pending-delete') {
      return;
    }

    counts.set(
      comment.filePath,
      (counts.get(comment.filePath) ?? 0) + 1 + (comment.replies?.length ?? 0)
    );
  });

  return counts;
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
