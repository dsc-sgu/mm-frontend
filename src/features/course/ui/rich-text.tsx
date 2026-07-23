import type { ReactNode } from 'react';

import { cn } from '@/shadcn/lib/utils';
import type { RichTextNode } from '@/features/course/features/page/model/types';

type CourseRichTextProps = {
  nodes: RichTextNode[];
  className?: string;
};

function applyMarks(node: RichTextNode, children: ReactNode) {
  return (node.marks ?? []).reduce((content, mark) => {
    if (mark === 'bold') {
      return <strong>{content}</strong>;
    }

    if (mark === 'italic') {
      return <em>{content}</em>;
    }

    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
        {content}
      </code>
    );
  }, children);
}

function renderNode(node: RichTextNode) {
  const content = applyMarks(node, node.text);

  if (node.type === 'text') {
    return <span key={node.id}>{content}</span>;
  }

  const opensInNewTab =
    node.linkType === 'external' && /^https?:\/\//iu.test(node.href);

  return (
    <a
      key={node.id}
      href={node.href}
      target={opensInNewTab ? '_blank' : undefined}
      rel={opensInNewTab ? 'noreferrer' : undefined}
      className={cn(
        'font-medium text-primary underline underline-offset-4',
        'hover:text-primary/80'
      )}
    >
      {content}
    </a>
  );
}

export function CourseRichText({ nodes, className }: CourseRichTextProps) {
  return (
    <span className={cn('wrap-break-word', className)}>
      {nodes.map(renderNode)}
    </span>
  );
}
