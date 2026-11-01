import type { ReactNode } from 'react';
import { isSafeCourseHref } from '@/features/course/model/links';

import { cn } from '@/shadcn/lib/utils';
import type { RichTextNode } from '@/features/course/model/rich-text';

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

function renderNode(node: RichTextNode, index: number) {
  const content = applyMarks(node, node.text);

  if (node.type === 'text') {
    return <span key={index}>{content}</span>;
  }

  const opensInNewTab = /^https?:\/\//iu.test(node.href);

  if (!isSafeCourseHref(node.href)) {
    return <span key={index}>{content}</span>;
  }
  return (
    <a
      key={index}
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
    <span className={cn('wrap-break-word whitespace-pre-wrap', className)}>
      {nodes.map(renderNode)}
    </span>
  );
}
