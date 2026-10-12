import { useMemo, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { FileCode } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';
import {
  buildRenderedMarkdownDiff,
  type RenderedMarkdownBlock,
  type RenderedMarkdownBlockChange,
} from '@/features/course/features/attempt-review/features/rendered-markdown/model/diff';
import styles from './diff.module.css';

type RenderedMarkdownDiffViewProps = {
  oldText: string;
  newText: string;
  lineCommentCount: number;
  onShowSource: () => void;
};

const blockVariants = cva(['block border-l-4 px-4 py-1 no-underline'], {
  variants: {
    change: {
      unchanged: 'border-transparent',
      added: ['border-emerald-500/70', 'bg-emerald-500/10'],
      deleted: ['border-rose-500/70', 'bg-rose-500/10'],
    } satisfies Record<RenderedMarkdownBlockChange, string | string[]>,
  },
});

export function RenderedMarkdownDiffView({
  oldText,
  newText,
  lineCommentCount,
  onShowSource,
}: RenderedMarkdownDiffViewProps) {
  const diff = useMemo(
    () => buildRenderedMarkdownDiff(oldText, newText),
    [oldText, newText]
  );

  if (diff.status === 'too-large') {
    return (
      <RenderedMarkdownNotice onShowSource={onShowSource}>
        Файл слишком большой, чтобы отрисовать его без задержек.
      </RenderedMarkdownNotice>
    );
  }

  if (diff.status === 'failed') {
    return (
      <RenderedMarkdownNotice onShowSource={onShowSource}>
        Не удалось отрисовать Markdown этого файла.
      </RenderedMarkdownNotice>
    );
  }

  const hasRenderedChanges = diff.blocks.some(
    (block) => block.change !== 'unchanged'
  );

  // The view is slotted into CodeView's <pre>, whose `white-space` it would
  // otherwise inherit and show the newlines between rendered tags.
  return (
    <div className="bg-card font-sans whitespace-normal">
      {lineCommentCount > 0 ? (
        <RenderedMarkdownNotice onShowSource={onShowSource}>
          Комментарии к строкам этого файла ({lineCommentCount}) видны в
          исходном диффе.
        </RenderedMarkdownNotice>
      ) : null}
      {diff.blocks.length === 0 ? (
        <RenderedMarkdownNotice onShowSource={onShowSource}>
          В файле нет содержимого, которое можно отрисовать.
        </RenderedMarkdownNotice>
      ) : null}
      {diff.blocks.length > 0 && !hasRenderedChanges ? (
        <RenderedMarkdownNotice onShowSource={onShowSource}>
          Отрисованный текст не изменился: правки затрагивают только разметку.
        </RenderedMarkdownNotice>
      ) : null}
      {diff.blocks.length > 0 ? (
        <div
          className={cn('py-3 text-sm text-card-foreground', styles.document)}
        >
          {diff.blocks.map((block, index) => (
            <RenderedMarkdownBlockView key={index} block={block} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RenderedMarkdownBlockView({
  block,
}: {
  block: RenderedMarkdownBlock;
}) {
  const content = (
    <div
      className={styles.block}
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  );

  if (block.change === 'added') {
    return (
      <ins className={blockVariants({ change: block.change })}>
        <span className="sr-only">Добавлено: </span>
        {content}
      </ins>
    );
  }

  if (block.change === 'deleted') {
    return (
      <del className={blockVariants({ change: block.change })}>
        <span className="sr-only">Удалено: </span>
        {content}
      </del>
    );
  }

  return (
    <div className={blockVariants({ change: block.change })}>{content}</div>
  );
}

function RenderedMarkdownNotice({
  children,
  onShowSource,
}: {
  children: ReactNode;
  onShowSource: () => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-b',
        'bg-muted/40 px-4 py-2 font-sans text-sm whitespace-normal',
        'text-muted-foreground'
      )}
    >
      <p>{children}</p>
      <Button type="button" variant="outline" size="sm" onClick={onShowSource}>
        <FileCode className="size-4" />
        Показать исходный дифф
      </Button>
    </div>
  );
}
