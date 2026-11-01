import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { ReviewTextDocument } from '@/features/course/features/review/model/text-document';
import { cn } from '@/shadcn/lib/utils';
import styles from './editor.module.css';

type Inline = Exclude<
  ReviewTextDocument['children'][number],
  { type: 'code' }
>['children'][number];

function renderInline(node: Inline, index: number): ReactNode {
  if ('url' in node) {
    const children = node.children.map(renderInline);
    if (node.url.startsWith('/'))
      return (
        <Link key={index} to={node.url}>
          {children}
        </Link>
      );
    return (
      <a key={index} href={node.url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  let children: ReactNode = node.text;
  if (node.bold) children = <strong>{children}</strong>;
  if (node.italic) children = <em>{children}</em>;
  if (node.strikethrough) children = <s>{children}</s>;
  if (node.code) children = <code>{children}</code>;

  return <span key={index}>{children}</span>;
}

type Block = ReviewTextDocument['children'][number];
type ListBlock = Extract<Block, { type: 'list-item' }>;

function renderBlocks(blocks: Block[]): ReactNode[] {
  const rendered: ReactNode[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    const key = index;

    if (block.type === 'list-item') {
      const items: ListBlock[] = [];
      while (index < blocks.length && blocks[index].type === 'list-item')
        items.push(blocks[index++] as ListBlock);

      let cursor = 0;

      function list(depth: number): ReactNode[] {
        const groups: ReactNode[] = [];

        while (cursor < items.length && items[cursor].indent >= depth) {
          const variant = items[cursor].variant;
          const entries: ReactNode[] = [];

          while (
            cursor < items.length &&
            items[cursor].indent >= depth &&
            items[cursor].variant === variant
          ) {
            const item = items[cursor++];
            const nested =
              cursor < items.length && items[cursor].indent > item.indent
                ? list(items[cursor].indent)
                : null;

            entries.push(
              <li key={cursor}>
                {item.children.map(renderInline)}
                {nested}
              </li>
            );

            if (cursor < items.length && items[cursor].indent < depth) break;
          }

          const Tag = variant === 'ordered' ? 'ol' : 'ul';
          groups.push(<Tag key={groups.length}>{entries}</Tag>);
        }

        return groups;
      }

      const groups: ReactNode[] = [];
      while (cursor < items.length) groups.push(...list(items[cursor].indent));

      rendered.push(<div key={key}>{groups}</div>);
      continue;
    }

    index++;

    if (block.type === 'code')
      rendered.push(
        <pre key={key}>
          <code>{block.text}</code>
        </pre>
      );
    else if (block.type === 'blockquote')
      rendered.push(
        <blockquote key={key}>{block.children.map(renderInline)}</blockquote>
      );
    else rendered.push(<p key={key}>{block.children.map(renderInline)}</p>);
  }

  return rendered;
}

export function RichTextContent({
  text,
  className,
}: {
  text: ReviewTextDocument | null;
  className?: string;
}) {
  if (!text)
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Нет сохранённого текста.
      </p>
    );

  return (
    <div className={cn('whitespace-pre-wrap', styles.readonly, className)}>
      {renderBlocks(text.children)}
    </div>
  );
}
