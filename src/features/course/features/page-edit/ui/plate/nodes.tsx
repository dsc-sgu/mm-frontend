import { Children, type ReactNode, useState } from 'react';
import {
  CalendarDays,
  FileText,
  ImageIcon,
  Paperclip,
  Trophy,
} from 'lucide-react';
import {
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
} from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';
import { CourseRichText } from '@/features/course/ui/rich-text';
import type { RichTextNode } from '@/features/course/features/page/model/types';
import { useCoursePageEditStore } from '@/features/course/features/page-edit/hooks/use-editor-store';
import { CodeLanguageSelect } from '@/features/course/features/page-edit/ui/plate/code-language-select';
import type { CoursePlateElement } from '@/features/course/features/page-edit/model/plate-content';
import { CoursePageBlockFrame } from '@/features/course/features/page-edit/ui/block-frame';

function getElement(element: unknown) {
  return element as CoursePlateElement;
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getRichTextPlainText(nodes: RichTextNode[] | undefined) {
  return nodes?.map((node) => node.text).join('') ?? '';
}

function createCaptionNodes(
  imageId: string,
  text: string
): RichTextNode[] | undefined {
  return text.length > 0
    ? [
        {
          id: `${imageId}:caption`,
          type: 'text',
          text,
        },
      ]
    : undefined;
}

export function ParagraphElement({ children, ...props }: PlateElementProps) {
  const element = getElement(props.element);
  const isListItem =
    element.listStyleType === 'disc' || element.listStyleType === 'decimal';
  const paragraphClassName = cn(
    'text-base leading-7 text-foreground/90 outline-none md:text-lg',
    isListItem && 'pl-1'
  );

  if (props.path.length > 1) {
    return (
      <PlateElement
        as="div"
        className={cn(paragraphClassName, isListItem ? 'my-1' : 'my-4')}
        {...props}
      >
        {children}
      </PlateElement>
    );
  }

  return (
    <CoursePageBlockFrame
      alignGutterToEditorContent={isListItem}
      frameClassName={isListItem ? 'my-1' : 'my-4'}
      contentClassName={paragraphClassName}
      {...props}
    >
      {children}
    </CoursePageBlockFrame>
  );
}

export function CourseListWrapper({ children, element }: PlateElementProps) {
  const courseElement = getElement(element);
  const ListTag = courseElement.listStyleType === 'decimal' ? 'ol' : 'ul';
  const listStart =
    typeof courseElement.listStart === 'number'
      ? courseElement.listStart
      : undefined;

  return (
    <ListTag
      className={cn(
        'my-1 pl-7 text-base leading-7 text-foreground/90 md:text-lg',
        '[&>li::marker]:text-muted-foreground'
      )}
      style={{
        listStyleType:
          typeof courseElement.listStyleType === 'string'
            ? courseElement.listStyleType
            : undefined,
      }}
      start={listStart}
    >
      <li className="pl-1">{children}</li>
    </ListTag>
  );
}

export function HeadingOneElement({ children, ...props }: PlateElementProps) {
  return (
    <CoursePageBlockFrame
      contentAs="h1"
      frameClassName="mt-8"
      contentClassName="text-3xl font-bold tracking-tight outline-none md:text-4xl"
      {...props}
    >
      {children}
    </CoursePageBlockFrame>
  );
}

export function HeadingTwoElement({ children, ...props }: PlateElementProps) {
  return (
    <CoursePageBlockFrame
      contentAs="h2"
      frameClassName="mt-8"
      contentClassName="text-2xl font-bold tracking-tight outline-none md:text-3xl"
      {...props}
    >
      {children}
    </CoursePageBlockFrame>
  );
}

export function HeadingThreeElement({ children, ...props }: PlateElementProps) {
  return (
    <CoursePageBlockFrame
      contentAs="h3"
      frameClassName="mt-8"
      contentClassName="text-xl font-semibold tracking-tight outline-none md:text-2xl"
      {...props}
    >
      {children}
    </CoursePageBlockFrame>
  );
}

export function BlockquoteElement({ children, ...props }: PlateElementProps) {
  return (
    <CoursePageBlockFrame
      contentAs="blockquote"
      frameClassName="my-4"
      contentClassName={cn(
        'rounded-r-2xl border-l-4 border-primary/70 bg-muted/60',
        'px-5 py-4 text-base leading-7 text-foreground/85 outline-none md:text-lg',
        '[&_.slate-p]:my-0'
      )}
      {...props}
    >
      {children}
    </CoursePageBlockFrame>
  );
}

export function LinkElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="span"
      className="font-medium text-primary underline underline-offset-4"
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function BoldLeaf({ children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf as="strong" className="font-semibold" {...props}>
      {children}
    </PlateLeaf>
  );
}

export function ItalicLeaf({ children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf as="em" className="italic" {...props}>
      {children}
    </PlateLeaf>
  );
}

export function InlineCodeLeaf({ children, ...props }: PlateLeafProps) {
  return (
    <PlateLeaf
      as="code"
      className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
      {...props}
    >
      {children}
    </PlateLeaf>
  );
}

export function CodeBlockElement({ children, ...props }: PlateElementProps) {
  const element = getElement(props.element);
  const language = typeof element.lang === 'string' ? element.lang : undefined;
  const fileName =
    typeof element.fileName === 'string' ? element.fileName : undefined;

  return (
    <CoursePageBlockFrame
      contentAs="figure"
      frameClassName="my-4"
      contentClassName={cn(
        'overflow-hidden rounded-2xl border border-border',
        'bg-slate-50 text-slate-950 outline-none dark:bg-zinc-950/90 dark:text-zinc-50'
      )}
      {...props}
    >
      <figcaption
        contentEditable={false}
        className={cn(
          'flex items-center gap-2 border-b border-black/10 px-4 py-2',
          'text-xs text-slate-600 dark:border-white/10 dark:text-zinc-300'
        )}
      >
        <CodeLanguageSelect
          language={language}
          onChange={(nextLanguage) => {
            props.editor.tf.setNodes(
              { lang: nextLanguage },
              { at: props.path }
            );
          }}
        />
        <input
          contentEditable={false}
          className="min-w-0 flex-1 truncate bg-transparent px-1 py-0.5 outline-none"
          aria-label="Название файла"
          value={fileName ?? ''}
          placeholder="Фрагмент кода"
          onChange={(event) => {
            props.editor.tf.setNodes(
              { fileName: event.target.value || undefined },
              { at: props.path }
            );
          }}
          onKeyDown={(event) => {
            const isSaveShortcut =
              (event.metaKey || event.ctrlKey) &&
              !event.altKey &&
              !event.shiftKey &&
              event.key.toLowerCase() === 's';

            if (!isSaveShortcut) {
              event.stopPropagation();
            }
          }}
        />
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-7 outline-none">
        {children}
      </pre>
    </CoursePageBlockFrame>
  );
}

export function CodeLineElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement as="div" className="min-h-6 outline-none" {...props}>
      {children}
    </PlateElement>
  );
}

export function CourseSpoilerTitleElement({
  children,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement
      as="span"
      className="text-base font-semibold text-foreground outline-none md:text-lg"
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function ToggleElement({ children, ...props }: PlateElementProps) {
  const element = getElement(props.element);
  const [isOpen, setIsOpen] = useState(element.defaultOpen === true);
  const [title, ...body] = Children.toArray(children);

  return (
    <CoursePageBlockFrame frameClassName="my-5" {...props}>
      <div
        className={cn(
          'flex cursor-default items-center gap-2 rounded-lg px-1',
          'text-base font-semibold text-foreground',
          'outline-none select-none focus-within:ring-2 focus-within:ring-ring'
        )}
      >
        <button
          type="button"
          contentEditable={false}
          className={cn(
            'inline-flex size-5 shrink-0 cursor-pointer items-center justify-center',
            'rounded text-muted-foreground transition-colors hover:bg-muted',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          )}
          aria-label={isOpen ? 'Свернуть спойлер' : 'Развернуть спойлер'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault();
            setIsOpen((current) => !current);
          }}
        >
          {isOpen ? '▾' : '▸'}
        </button>
        <span className="cursor-text select-text">{title}</span>
      </div>
      {isOpen && body.length > 0 && (
        <div className="border-l border-border/80 pl-4">{body}</div>
      )}
    </CoursePageBlockFrame>
  );
}

function MissingResource({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-dashed border-border',
        'bg-muted/40 px-4 py-3 text-sm text-muted-foreground'
      )}
    >
      <Paperclip className="size-4" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function CourseImageElement({ children, ...props }: PlateElementProps) {
  const element = getElement(props.element);
  const changeResources = useCoursePageEditStore(
    (state) => state.changeResources
  );
  const resources = useCoursePageEditStore((state) => state.resources);
  const imageId = typeof element.imageId === 'string' ? element.imageId : '';
  const image = resources.images.find((item) => item.id === imageId);
  const captionText = getRichTextPlainText(image?.caption);

  function updateCaption(nextCaptionText: string) {
    changeResources({
      ...resources,
      images: resources.images.map((resource) =>
        resource.id === imageId
          ? {
              ...resource,
              caption: createCaptionNodes(imageId, nextCaptionText),
            }
          : resource
      ),
    });
  }

  return (
    <CoursePageBlockFrame frameClassName="my-4" {...props}>
      <div contentEditable={false} className="cursor-default select-none">
        {image ? (
          <figure className="overflow-hidden rounded-3xl border border-border bg-card">
            <img
              src={image.src}
              alt={image.alt}
              className="max-h-[28rem] w-full object-cover"
            />
            <figcaption className="px-4 py-3 text-sm leading-6 text-muted-foreground">
              <textarea
                aria-label="Подпись к картинке"
                className={cn(
                  'block min-h-7 w-full resize-y bg-transparent outline-none',
                  'cursor-text select-text placeholder:text-muted-foreground/70',
                  'focus:text-foreground'
                )}
                placeholder="Добавьте подпись…"
                rows={1}
                value={captionText}
                onChange={(event) => updateCaption(event.target.value)}
                onKeyDown={(event) => {
                  const isSaveShortcut =
                    (event.metaKey || event.ctrlKey) &&
                    !event.altKey &&
                    !event.shiftKey &&
                    event.key.toLowerCase() === 's';

                  if (!isSaveShortcut) {
                    event.stopPropagation();
                  }
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              />
            </figcaption>
          </figure>
        ) : (
          <MissingResource>
            Картинка курса недоступна: {imageId}
          </MissingResource>
        )}
      </div>
      {children}
    </CoursePageBlockFrame>
  );
}

export function CourseFilesElement({ children, ...props }: PlateElementProps) {
  const element = getElement(props.element);
  const resources = useCoursePageEditStore((state) => state.resources);
  const fileIds = Array.isArray(element.fileIds)
    ? element.fileIds.filter(
        (fileId): fileId is string => typeof fileId === 'string'
      )
    : [];

  return (
    <CoursePageBlockFrame frameClassName="my-4" {...props}>
      <div
        contentEditable={false}
        className="grid cursor-default gap-2 select-none"
      >
        {fileIds.length > 0 ? (
          fileIds.map((fileId) => {
            const file = resources.files.find((item) => item.id === fileId);

            return file ? (
              <div
                key={file.id}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border border-black/10 bg-primary/3',
                  'px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10'
                )}
              >
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <FileText
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {file.name}
                </span>
                {(file.size || file.mimeType) && (
                  <span className="text-sm text-muted-foreground">
                    {[file.size, file.mimeType].filter(Boolean).join(' • ')}
                  </span>
                )}
              </div>
            ) : (
              <MissingResource key={fileId}>
                Файл курса недоступен: {fileId}
              </MissingResource>
            );
          })
        ) : (
          <MissingResource>Файлы курса не выбраны</MissingResource>
        )}
      </div>
      {children}
    </CoursePageBlockFrame>
  );
}

export function CourseAssignmentElement({
  children,
  ...props
}: PlateElementProps) {
  const element = getElement(props.element);
  const resources = useCoursePageEditStore((state) => state.resources);
  const taskId = typeof element.taskId === 'string' ? element.taskId : '';
  const assignment = resources.assignments.find(
    (item) => item.taskId === taskId
  );

  return (
    <CoursePageBlockFrame frameClassName="my-4" {...props}>
      <div contentEditable={false} className="cursor-default select-none">
        {assignment ? (
          <div
            className={cn(
              'block rounded-xl border border-black/10 bg-primary/3 p-4',
              'md:rounded-2xl md:p-5 dark:border-white/10'
            )}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                  <Trophy className="size-4" aria-hidden="true" />
                  Задание
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {assignment.title}
                </div>
                {assignment.description && (
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">
                    <CourseRichText nodes={assignment.description} />
                  </div>
                )}
              </div>
              {(assignment.dueDate || assignment.maxScore) && (
                <div className="grid gap-2 text-sm text-muted-foreground md:min-w-48">
                  {assignment.dueDate && (
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {formatDueDate(assignment.dueDate)}
                    </span>
                  )}
                  {assignment.maxScore !== undefined && (
                    <span>Максимум: {assignment.maxScore} баллов</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <MissingResource>Задание курса недоступно: {taskId}</MissingResource>
        )}
      </div>
      {children}
    </CoursePageBlockFrame>
  );
}

export function CourseUnknownElement({
  children,
  ...props
}: PlateElementProps) {
  return (
    <CoursePageBlockFrame
      frameClassName="my-4"
      contentClassName="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground outline-none"
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        <ImageIcon className="size-4" aria-hidden="true" />
        Неизвестный блок
      </span>
      {children}
    </CoursePageBlockFrame>
  );
}
