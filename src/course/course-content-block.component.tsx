import { Link } from '@tanstack/react-router';
import { CalendarDays, Trophy } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import { CourseCodeBlock } from './course-code-block.component';
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
        'my-4 space-y-2 pl-6 text-base leading-7 text-foreground/90',
        block.variant === 'ordered' ? 'list-decimal' : 'list-disc'
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="my-1">
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
        <p className="my-4 text-base leading-7 text-foreground/90 md:text-lg">
          <CourseRichText nodes={block.children} />
        </p>
      );
    case 'heading': {
      const HeadingTag = `h${block.level}` as const;
      const headingClassName = {
        1: 'mt-8 text-3xl font-bold tracking-tight md:text-4xl',
        2: 'mt-8 text-2xl font-bold tracking-tight md:text-3xl',
        3: 'mt-8 text-xl font-semibold tracking-tight md:text-2xl',
      }[block.level];

      return (
        <HeadingTag className={headingClassName}>
          <CourseRichText nodes={block.children} />
        </HeadingTag>
      );
    }
    case 'quote':
      return (
        <blockquote className="my-4 rounded-r-2xl border-l-4 border-primary/70 bg-muted/60 px-5 py-4 text-base leading-7 text-foreground/85 md:text-lg">
          <CourseRichText nodes={block.children} />
        </blockquote>
      );
    case 'list':
      return <ListBlock block={block} />;
    case 'spoiler':
      return (
        <details className="my-5" open={block.defaultOpen}>
          <summary className="cursor-pointer select-none rounded-lg px-1 text-base font-semibold outline-none marker:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <CourseRichText nodes={block.title} />
          </summary>
          <CourseContentBlocks
            blocks={block.children}
            courseSlug={courseSlug}
            className="border-l border-border/80 pl-4"
          />
        </details>
      );
    case 'code':
      return (
        <CourseCodeBlock
          code={block.code}
          language={block.language}
          fileName={block.fileName}
        />
      );
    case 'image':
      return (
        <figure className="my-4 overflow-hidden rounded-3xl border border-border bg-card">
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
        <section className="grid gap-2 my-4">
          {block.files.map((file) => (
            <a
              key={file.id}
              href={file.href}
              className="flex flex-col gap-1 border border-black/10 dark:border-white/10 rounded-xl bg-primary/3 hover:bg-primary/6 px-4 py-3 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium text-foreground">{file.name}</span>
              {(file.size || file.mimeType) && (
                <span className="text-sm text-muted-foreground">
                  {[file.size, file.mimeType].filter(Boolean).join(' • ')}
                </span>
              )}
            </a>
          ))}
        </section>
      );
    case 'assignment':
      return (
        <Link
          to="/courses/$courseSlug/tasks/$taskId"
          params={{ courseSlug, taskId: block.taskId }}
          className="group my-4 block border border-black/10 dark:border-white/10 rounded-2xl bg-primary/3 p-5 transition-colors hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <span className="text-right">Макс. балл: {block.maxScore}</span>
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
    <div className={className}>
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
