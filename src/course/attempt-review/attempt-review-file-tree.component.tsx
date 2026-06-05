import { useEffect, useMemo } from 'react';
import { FileTree, useFileTree } from '@pierre/trees/react';

import { cn } from '@/shadcn/lib/utils';
import type { AttemptReviewChangedFile } from './attempt-review.types';

interface AttemptReviewFileTreeProps {
  files: AttemptReviewChangedFile[];
  activeFilePath: string | null;
  className?: string;
  onSelectFile: (path: string) => void;
}

export function AttemptReviewFileTree({
  files,
  activeFilePath,
  className,
  onSelectFile,
}: AttemptReviewFileTreeProps) {
  const statsByPath = useMemo(
    () => new Map(files.map((file) => [file.path, file])),
    [files]
  );
  const paths = useMemo(() => files.map((file) => file.path), [files]);
  const { model } = useFileTree({
    paths,
    flattenEmptyDirectories: true,
    initialExpansion: 'open',
    initialSelectedPaths: activeFilePath ? [activeFilePath] : [],
    search: true,
    itemHeight: 30,
    onSelectionChange: (selectedPaths) => {
      const selected = selectedPaths[0];

      if (selected) {
        onSelectFile(selected);
      }
    },
    renderRowDecoration: ({ item }) => {
      const file = statsByPath.get(item.path);

      if (!file) {
        return null;
      }

      return {
        text: `${statusGlyph(file.status)} +${file.addedLines}/−${file.deletedLines}`,
        title: `${statusLabel(file.status)}: +${file.addedLines}, −${file.deletedLines}`,
      };
    },
    unsafeCSS: `
      :host { --trees-selected-bg-override: color-mix(in oklch, var(--primary, #111) 12%, transparent); }
      button[data-type='item'] { border-radius: 10px; }
    `,
  });

  useEffect(() => {
    model.resetPaths(paths);
  }, [model, paths]);

  useEffect(() => {
    if (!activeFilePath || !paths.includes(activeFilePath)) {
      return;
    }

    const item = model.getItem(activeFilePath);
    item?.select();
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
        'flex min-h-80 flex-col overflow-hidden border-b bg-card xl:border-r xl:border-b-0',
        className
      )}
    >
      <div className="shrink-0 border-b px-3 py-2.5">
        <h2 className="text-sm font-semibold">Изменённые файлы</h2>
      </div>
      <FileTree
        model={model}
        className="attempt-review-file-tree min-h-0 flex-1 pt-2"
        style={{ width: '100%' }}
      />
    </div>
  );
}

function statusGlyph(status: AttemptReviewChangedFile['status']): string {
  if (status === 'added') {
    return 'A';
  }

  if (status === 'deleted') {
    return 'D';
  }

  return 'M';
}

function statusLabel(status: AttemptReviewChangedFile['status']): string {
  if (status === 'added') {
    return 'Добавлен';
  }

  if (status === 'deleted') {
    return 'Удалён';
  }

  return 'Изменён';
}
