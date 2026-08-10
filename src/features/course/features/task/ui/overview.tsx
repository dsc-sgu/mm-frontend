import { Link } from '@tanstack/react-router';
import {
  ArrowUpRight,
  CalendarClock,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
  Video,
  Paperclip,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { formatTaskDateTime } from '@/features/course/features/task/model/date-format';
import type {
  CourseTaskAttachment,
  CourseTaskAttachmentKind,
  CourseTaskPage,
} from '@/features/course/features/task/model/types';
import { cn } from '@/shadcn/lib/utils';

export function TaskOverview({ task }: { task: CourseTaskPage }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
      <div className="relative px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <h1
          className={cn(
            'max-w-4xl text-2xl leading-tight font-bold tracking-tight',
            'text-foreground sm:text-3xl lg:text-4xl'
          )}
        >
          Задание №{task.taskNumber} — {task.title}
        </h1>
        <p
          className={cn(
            'mt-4 max-w-3xl text-base leading-7 text-foreground/80',
            'sm:text-lg sm:leading-8'
          )}
        >
          {task.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <CalendarClock
            className="size-4 text-rose-600 dark:text-rose-300"
            aria-hidden="true"
          />
          <span className="font-semibold text-rose-700 dark:text-rose-300">
            Дедлайн:
          </span>
          <time dateTime={task.deadlineAt} className="font-semibold">
            {formatTaskDateTime(task.deadlineAt)}
          </time>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Paperclip
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold">Материалы к заданию</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {task.attachments.map((attachment) => (
              <TaskAttachmentLink
                key={attachment.id}
                attachment={attachment}
                courseSlug={task.courseSlug}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const ATTACHMENT_KIND_CONFIG: Record<
  CourseTaskAttachmentKind,
  { Icon: LucideIcon; iconClassName: string }
> = {
  pdf: {
    Icon: FileText,
    iconClassName:
      'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  document: {
    Icon: FileType2,
    iconClassName:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  spreadsheet: {
    Icon: FileSpreadsheet,
    iconClassName:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  presentation: {
    Icon: Presentation,
    iconClassName:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  archive: {
    Icon: FileArchive,
    iconClassName:
      'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
  code: {
    Icon: FileCode2,
    iconClassName:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  image: {
    Icon: FileImage,
    iconClassName:
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  },
  media: {
    Icon: Video,
    iconClassName:
      'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  other: {
    Icon: File,
    iconClassName:
      'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
  },
};

function TaskAttachmentLink({
  attachment,
  courseSlug,
}: {
  attachment: CourseTaskAttachment;
  courseSlug: string;
}) {
  const { Icon, iconClassName } = ATTACHMENT_KIND_CONFIG[attachment.kind];
  const format = attachment.name.split('.').pop()?.toUpperCase() ?? 'ФАЙЛ';

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
      <div
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl',
          iconClassName
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-semibold">
          {attachment.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {format} · {attachment.size}
        </p>
      </div>
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
