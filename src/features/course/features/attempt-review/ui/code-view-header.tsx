import { cva } from 'class-variance-authority';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { getAttemptReviewFileStatusGlyph } from '@/features/course/features/attempt-review/model/file-status';
import type {
  AttemptReviewChangedFile,
  AttemptReviewFileStatus,
} from '@/features/course/features/attempt-review/model/types';

type AttemptReviewCodeViewHeaderProps = {
  file: AttemptReviewChangedFile;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

type FileStatusIconVariant = 'added' | 'deleted' | 'modified';

const fileStatusIconVariants = cva(
  [
    'flex size-5 shrink-0 items-center justify-center',
    'rounded-md border text-xs leading-none',
  ],
  {
    variants: {
      status: {
        added: [
          'border-emerald-500/50',
          'bg-emerald-500/10',
          'text-emerald-500',
        ],
        deleted: ['border-rose-500/50', 'bg-rose-500/10', 'text-rose-500'],
        modified: ['border-blue-500/50', 'bg-blue-500/10', 'text-blue-500'],
      } satisfies Record<FileStatusIconVariant, string[]>,
    },
  }
);

function getFileStatusIconVariant(
  status: AttemptReviewFileStatus
): FileStatusIconVariant {
  if (status === 'changed') {
    return 'modified';
  }

  return status;
}

export function AttemptReviewCodeViewHeader({
  file,
  collapsed,
  onToggleCollapsed,
}: AttemptReviewCodeViewHeaderProps) {
  return (
    <div className="flex h-14 min-w-0 items-center justify-between gap-3 border-b bg-card/95 px-4 text-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex min-w-0 items-center gap-2 font-medium text-card-foreground">
        <button
          type="button"
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={
            collapsed ? 'Показать изменение файла' : 'Скрыть изменение файла'
          }
          title={
            collapsed ? 'Показать изменение файла' : 'Скрыть изменение файла'
          }
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        <span
          className={fileStatusIconVariants({
            status: getFileStatusIconVariant(file.status),
          })}
          aria-hidden="true"
        >
          <span className="-translate-y-px leading-none">
            {getAttemptReviewFileStatusGlyph(file.status)}
          </span>
        </span>
        <span className="min-w-0 truncate">{file.path}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
        {file.deletedLines > 0 || file.addedLines === 0 ? (
          <span className="text-rose-500">−{file.deletedLines}</span>
        ) : null}
        {file.addedLines > 0 || file.deletedLines === 0 ? (
          <span className="text-emerald-500">+{file.addedLines}</span>
        ) : null}
      </div>
    </div>
  );
}
