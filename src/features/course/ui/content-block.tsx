import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarDays, Paperclip, Trophy } from 'lucide-react';

import { CodeBlock } from '@/features/code-block/ui/block';
import { cn } from '@/shadcn/lib/utils';
import { sortRankedContent } from '@/features/course/features/page/model/rank';
import type {
  CourseContentBlockItem,
  CourseFileResource,
  CourseListBlock,
  CourseListItem,
  CoursePageResources,
} from '@/features/course/features/page/model/types';
import { CourseRichText } from '@/features/course/ui/rich-text';

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

type RenderableCourseListItem = CourseListItem & {
  nestedItems: RenderableCourseListItem[];
};

function getListItemIndent(item: CourseListItem) {
  return typeof item.indent === 'number' && Number.isFinite(item.indent)
    ? Math.max(1, Math.round(item.indent))
    : 1;
}

function buildListTree(items: CourseListItem[]) {
  const rootItems: RenderableCourseListItem[] = [];
  const stack: Array<{ indent: number; items: RenderableCourseListItem[] }> = [
    { indent: 1, items: rootItems },
  ];

  items.forEach((item) => {
    const indent = getListItemIndent(item);
    const listItem = { ...item, nestedItems: [] };

    while (stack.length > 1 && indent < stack[stack.length - 1].indent) {
      stack.pop();
    }

    const currentLevel = stack[stack.length - 1];

    if (indent > currentLevel.indent) {
      const parentItem = currentLevel.items.at(-1);

      if (parentItem) {
        stack.push({ indent, items: parentItem.nestedItems });
      }
    }

    stack[stack.length - 1].items.push(listItem);
  });

  return rootItems;
}

function ListItems({
  items,
  variant,
}: {
  items: RenderableCourseListItem[];
  variant: CourseListBlock['variant'];
}) {
  const ListTag = variant === 'ordered' ? 'ol' : 'ul';

  return (
    <ListTag
      className={cn(
        'space-y-2 pl-6 text-base leading-7 text-foreground/90',
        variant === 'ordered' ? 'list-decimal' : 'list-disc'
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="my-1">
          <CourseRichText nodes={item.children} />
          {item.nestedItems.length > 0 && (
            <ListItems items={item.nestedItems} variant={variant} />
          )}
        </li>
      ))}
    </ListTag>
  );
}

function ListBlock({ block }: { block: CourseListBlock }) {
  return (
    <div className="my-4">
      <ListItems
        items={buildListTree(sortRankedContent(block.items))}
        variant={block.variant}
      />
    </div>
  );
}

function MissingResource({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'my-4 flex items-center gap-3 rounded-xl border border-dashed',
        'border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground'
      )}
    >
      <Paperclip className="size-4" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function FileLink({ file }: { file: CourseFileResource }) {
  return (
    <a
      href={file.href}
      className={cn(
        'flex flex-col gap-1 rounded-xl border',
        'border-black/10 bg-primary/3 dark:border-white/10',
        'px-4 py-3 transition-colors',
        'hover:bg-muted/70 hover:bg-primary/6',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'sm:flex-row sm:items-center sm:justify-between'
      )}
    >
      <span className="font-medium text-foreground">{file.name}</span>
      {(file.size || file.mimeType) && (
        <span className="text-sm text-muted-foreground">
          {[file.size, file.mimeType].filter(Boolean).join(' • ')}
        </span>
      )}
    </a>
  );
}

function MissingFile({ fileId }: { fileId: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border border-dashed border-border',
        'bg-muted/40 px-4 py-3 text-sm text-muted-foreground',
        'sm:flex-row sm:items-center sm:justify-between'
      )}
    >
      <span>Файл курса недоступен</span>
      <span className="font-mono text-xs">{fileId}</span>
    </div>
  );
}

function CourseContentBlock({
  block,
  courseSlug,
  resources,
}: {
  block: CourseContentBlockItem;
  courseSlug: string;
  resources: CoursePageResources;
}) {
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
        <blockquote
          className={cn(
            'my-4 rounded-r-2xl border-l-4 border-primary/70 bg-muted/60',
            'px-5 py-4 text-base leading-7 text-foreground/85 md:text-lg'
          )}
        >
          <p className="m-0">
            <CourseRichText nodes={block.children} />
          </p>
        </blockquote>
      );
    case 'list':
      return <ListBlock block={block} />;
    case 'spoiler':
      return (
        <details className="my-5" open={block.defaultOpen}>
          <summary
            className={cn(
              'cursor-pointer rounded-lg px-1 select-none',
              'text-base font-semibold marker:text-muted-foreground',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <CourseRichText nodes={block.title} />
          </summary>
          <CourseContentBlocks
            blocks={block.children}
            courseSlug={courseSlug}
            resources={resources}
            className="border-l border-border/80 pl-4"
          />
        </details>
      );
    case 'code':
      return (
        <CodeBlock
          code={block.code}
          language={block.language}
          fileName={block.fileName}
        />
      );
    case 'image': {
      const image = resources.images.find((item) => item.id === block.imageId);

      if (!image) {
        return (
          <MissingResource>
            Картинка курса недоступна: {block.imageId}
          </MissingResource>
        );
      }

      return (
        <figure
          className={cn(
            'my-4 overflow-hidden rounded-3xl border border-border bg-card'
          )}
        >
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-[28rem] w-full object-cover"
          />
          {image.caption && (
            <figcaption
              className={cn(
                'px-4 py-3 text-sm leading-6 text-muted-foreground'
              )}
            >
              <CourseRichText nodes={image.caption} />
            </figcaption>
          )}
        </figure>
      );
    }
    case 'files':
      return (
        <section className="my-4 grid gap-2">
          {block.fileIds.map((fileId) => {
            const file = resources.files.find((item) => item.id === fileId);

            if (!file) {
              return <MissingFile key={fileId} fileId={fileId} />;
            }

            return <FileLink key={file.id} file={file} />;
          })}
        </section>
      );
    case 'assignment': {
      const assignment = resources.assignments.find(
        (item) => item.taskId === block.taskId
      );

      if (!assignment) {
        return (
          <MissingResource>
            Задание курса недоступно: {block.taskId}
          </MissingResource>
        );
      }

      return (
        <Link
          to="/courses/$courseSlug/tasks/$taskId"
          params={{ courseSlug, taskId: assignment.taskId }}
          className={cn(
            'group my-4 block rounded-xl border border-black/10 bg-primary/3',
            'p-4 transition-colors hover:bg-primary/6',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            'md:rounded-2xl md:p-5 dark:border-white/10'
          )}
        >
          <div
            className={cn(
              'flex flex-col gap-4 md:flex-row md:items-start',
              'md:justify-between'
            )}
          >
            <div className="min-w-0">
              <div
                className={cn(
                  'mb-2 flex items-center gap-2',
                  'text-xs font-semibold tracking-wide text-primary uppercase',
                  'md:text-sm'
                )}
              >
                <Trophy className="size-4" aria-hidden="true" />
                Задание
              </div>
              <h3
                className={cn(
                  'text-lg font-semibold tracking-tight group-hover:underline',
                  'md:text-xl'
                )}
              >
                {assignment.title}
              </h3>
              {assignment.description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <CourseRichText nodes={assignment.description} />
                </p>
              )}
            </div>
            <div
              className={cn(
                'flex shrink-0 flex-col items-start gap-2 text-sm',
                'text-muted-foreground md:items-end'
              )}
            >
              {assignment.dueDate && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {formatDueDate(assignment.dueDate)}
                </span>
              )}
              {assignment.maxScore !== undefined && (
                <span>Макс. балл: {assignment.maxScore}</span>
              )}
            </div>
          </div>
        </Link>
      );
    }
  }
}

export function CourseContentBlocks({
  blocks,
  courseSlug,
  resources,
  className,
}: {
  blocks: CourseContentBlockItem[];
  courseSlug: string;
  resources: CoursePageResources;
  className?: string;
}) {
  return (
    <div className={className}>
      {sortRankedContent(blocks).map((block) => (
        <CourseContentBlock
          key={block.id}
          block={block}
          courseSlug={courseSlug}
          resources={resources}
        />
      ))}
    </div>
  );
}
