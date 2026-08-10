import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Paperclip,
  Presentation,
  Video,
} from 'lucide-react';

import {
  formatFileSize,
  getAttachmentCategory,
  getAttachmentExtension,
} from '@/features/course/features/task/model/attachment';
import type { AttachmentCategory } from '@/features/course/features/task/model/attachment';
import type { TaskAttachment } from '@/features/course/features/task/model/types';
import { cn } from '@/shadcn/lib/utils';

const CATEGORY_VISUALS: Record<
  AttachmentCategory,
  { Icon: LucideIcon; className: string }
> = {
  pdf: {
    Icon: FileText,
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  document: {
    Icon: FileType2,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  spreadsheet: {
    Icon: FileSpreadsheet,
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  presentation: {
    Icon: Presentation,
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  archive: {
    Icon: FileArchive,
    className: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
  code: {
    Icon: FileCode2,
    className:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  image: {
    Icon: FileImage,
    className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  },
  media: {
    Icon: Video,
    className:
      'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  other: {
    Icon: File,
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
  },
};

export function TaskAttachments({
  attachments,
  courseSlug,
}: {
  attachments: TaskAttachment[];
  courseSlug: string;
}) {
  return (
    <section className="mt-6 border-t border-border pt-5">
      <div className="mb-3 flex items-center gap-2">
        <Paperclip
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="text-sm font-semibold">Материалы к заданию</h2>
      </div>

      {attachments.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((attachment) => (
            <TaskAttachmentLink
              key={attachment.id}
              attachment={attachment}
              courseSlug={courseSlug}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          К заданию не прикреплены материалы.
        </p>
      )}
    </section>
  );
}

function TaskAttachmentLink({
  attachment,
  courseSlug,
}: {
  attachment: TaskAttachment;
  courseSlug: string;
}) {
  const category = getAttachmentCategory(attachment);
  const { Icon, className: iconClassName } = CATEGORY_VISUALS[category];
  const format = getAttachmentExtension(attachment.name);
  const size = formatFileSize(attachment.sizeBytes);

  return (
    <Link
      to="/courses/$courseSlug/files"
      params={{ courseSlug }}
      title={`Открыть ${attachment.name} в файлах курса`}
      className={cn(
        'group flex min-w-0 items-center gap-3 rounded-2xl border bg-background',
        'p-3 transition-[border-color,background-color,transform] duration-200',
        'hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-accent/50',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl',
          iconClassName
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm font-semibold">
          {attachment.name}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {format} · {size}
        </span>
      </span>

      <ArrowUpRight
        className={cn(
          'size-4 shrink-0 text-muted-foreground transition-transform',
          'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
        )}
        aria-hidden="true"
      />
    </Link>
  );
}
