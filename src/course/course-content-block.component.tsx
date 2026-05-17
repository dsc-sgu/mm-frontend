import { Link } from '@tanstack/react-router';
import { CalendarDays, FileText, Trophy } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import type {
  CourseContentBlock as CourseContentBlockModel,
  CourseListBlock,
} from './course-page.types';
import { sortByRank } from './course-page.utils';
import { CourseRichText } from './course-rich-text.component';

type CourseContentBlocksProps = {
  blocks: CourseContentBlockModel[];
  courseSlug: string;
  className?: string;
};

type CourseContentBlockProps = {
  block: CourseContentBlockModel;
  courseSlug: string;
};

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ListBlock({ block }: { block: CourseListBlock }) {
  const items = sortByRank(block.items);
  const ListTag = block.variant === 'ordered' ? 'ol' : 'ul';

  return (
    <ListTag
      className={cn(
        'my-5 space-y-2 pl-6 text-base leading-8 text-foreground/90',
        block.variant === 'ordered' ? 'list-decimal' : 'list-disc'
      )}
    >
      {items.map((item) => (
        <li key={item.id}>
          <CourseRichText nodes={item.children} />
        </li>
      ))}
    </ListTag>
  );
}

function CourseContentBlock({ block, courseSlug }: CourseContentBlockProps) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="my-5 text-base leading-8 text-foreground/90 md:text-lg">
          <CourseRichText nodes={block.children} />
        </p>
      );
    case 'heading': {
      const HeadingTag = `h${block.level}` as const;
      const headingClassName = {
        1: 'mt-10 mb-5 text-3xl font-bold tracking-tight md:text-4xl',
        2: 'mt-10 mb-4 text-2xl font-bold tracking-tight md:text-3xl',
        3: 'mt-8 mb-3 text-xl font-semibold tracking-tight md:text-2xl',
      }[block.level];

      return (
        <HeadingTag className={headingClassName}>
          <CourseRichText nodes={block.children} />
        </HeadingTag>
      );
    }
    case 'quote':
      return (
        <blockquote className="my-6 rounded-r-2xl border-l-4 border-primary/70 bg-muted/60 px-5 py-4 text-base leading-8 text-foreground/85 md:text-lg">
          <CourseRichText nodes={block.children} />
        </blockquote>
      );
    case 'list':
      return <ListBlock block={block} />;
    case 'spoiler':
      return (
        <details
          className="my-6 rounded-2xl border border-border bg-card/80 p-4 shadow-xs open:shadow-sm"
          open={block.defaultOpen}
        >
          <summary className="cursor-pointer rounded-lg px-1 py-2 text-base font-semibold outline-none marker:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <CourseRichText nodes={block.title} />
          </summary>
          <CourseContentBlocks
            blocks={block.children}
            courseSlug={courseSlug}
            className="mt-3 border-l border-border/80 pl-4"
          />
        </details>
      );
    case 'code':
      return (
        <figure className="my-6 overflow-hidden rounded-2xl border border-border bg-zinc-950 text-zinc-50 shadow-sm dark:bg-zinc-950/90">
          {(block.fileName || block.language) && (
            <figcaption className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2 text-xs text-zinc-300">
              <span>{block.fileName ?? 'Фрагмент кода'}</span>
              {block.language && (
                <span className="uppercase tracking-wide">
                  {block.language}
                </span>
              )}
            </figcaption>
          )}
          <pre className="overflow-x-auto p-4 text-sm leading-7">
            <code>{block.code}</code>
          </pre>
        </figure>
      );
    case 'image':
      return (
        <figure className="my-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <img
            src={block.src}
            alt={block.alt}
            className="max-h-[28rem] w-full object-cover"
          />
          {block.caption && (
            <figcaption className="px-4 py-3 text-sm leading-6 text-muted-foreground">
              <CourseRichText nodes={block.caption} />
            </figcaption>
          )}
        </figure>
      );
    case 'files':
      return (
        <section className="my-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <FileText className="size-5 text-primary" aria-hidden="true" />
            Файлы
          </h3>
          <div className="grid gap-2">
            {block.files.map((file) => (
              <a
                key={file.id}
                href={file.href}
                className="flex flex-col gap-1 rounded-xl border border-border/70 bg-background px-4 py-3 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-foreground">{file.name}</span>
                {(file.size || file.mimeType) && (
                  <span className="text-sm text-muted-foreground">
                    {[file.size, file.mimeType].filter(Boolean).join(' • ')}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>
      );
    case 'assignment':
      return (
        <Link
          to="/courses/$courseSlug/tasks/$taskId"
          params={{ courseSlug, taskId: block.taskId }}
          className="group my-6 block rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                <Trophy className="size-4" aria-hidden="true" />
                Задание
              </div>
              <h3 className="text-xl font-semibold tracking-tight group-hover:underline">
                {block.title}
              </h3>
              {block.description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <CourseRichText nodes={block.description} />
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-2 text-sm text-muted-foreground">
              {block.dueDate && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {formatDueDate(block.dueDate)}
                </span>
              )}
              {block.maxScore !== undefined && (
                <span>Макс. балл: {block.maxScore}</span>
              )}
            </div>
          </div>
        </Link>
      );
  }
}

export function CourseContentBlocks({
  blocks,
  courseSlug,
  className,
}: CourseContentBlocksProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {sortByRank(blocks).map((block) => (
        <CourseContentBlock
          key={block.id}
          block={block}
          courseSlug={courseSlug}
        />
      ))}
    </div>
  );
}
