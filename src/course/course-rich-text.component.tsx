import type { ReactNode } from 'react';

import { cn } from '@/shadcn/lib/utils';
import type { RichTextNode } from './course-page.types';

type CourseRichTextProps = {
  nodes: RichTextNode[];
  className?: string;
};

function applyMarks(node: RichTextNode, children: ReactNode) {
  return (node.marks ?? []).reduce((content, mark) => {
    if (mark === 'bold') {
      return <strong>{content}</strong>;
    }

    return <em>{content}</em>;
  }, children);
}

function renderNode(node: RichTextNode, index: number) {
  const content = applyMarks(node, node.text);

  if (node.type === 'text') {
    return <span key={index}>{content}</span>;
  }

  if (node.linkType === 'external') {
    return (
      <a
        key={index}
        href={node.href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      >
        {content}
      </a>
    );
  }

  return (
    <a
      key={index}
      href={node.href}
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
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
