import { TextApi, ElementApi, type Value } from 'platejs';
import type { ReviewTextDocument } from './text-document';
import { normalizeReviewText } from './text-document';

type Block = ReviewTextDocument['children'][number];

type Inline = Exclude<Block, { type: 'code' }>['children'][number];

export function toReviewPlate(document: ReviewTextDocument | null): Value {
  return (
    document?.children.map((block) => {
      if (block.type === 'code') {
        return {
          type: 'code_block',
          children: block.text
            .split('\n')
            .map((text) => ({ type: 'code_line', children: [{ text }] })),
        };
      }
      if (block.type === 'blockquote') {
        return {
          type: 'blockquote',
          children: [{ type: 'p', children: block.children }],
        };
      }
      if (block.type === 'list-item') {
        return {
          type: 'p',
          listStyleType: block.variant === 'ordered' ? 'decimal' : 'disc',
          indent: block.indent + 1,
          children: block.children,
        };
      }

      return block;
    }) ?? [{ type: 'p', children: [{ text: '' }] }]
  );
}

function inline(nodes: Value[number]['children']): Inline[] {
  return nodes.flatMap((node, index): Inline[] => {
    if (TextApi.isText(node)) {
      return [
        {
          text: node.text,
          ...(node.bold ? { bold: true as const } : {}),
          ...(node.italic ? { italic: true as const } : {}),
          ...(node.strikethrough ? { strikethrough: true as const } : {}),
          ...(node.code ? { code: true as const } : {}),
        },
      ];
    }

    if (node.type === 'a') {
      return [
        {
          type: 'a',
          url: String(node.url),
          children: inline(node.children).flatMap((child) =>
            'text' in child ? [child] : child.children
          ),
        },
      ];
    }

    const children = inline(node.children);

    return index > 0 ? [{ text: '\n' }, ...children] : children;
  });
}

export function fromReviewPlate(value: Value): ReviewTextDocument | null {
  const children: Block[] = value.map((node) => {
    if (node.type === 'code_block') {
      return {
        type: 'code',
        text: node.children
          .map((line) =>
            ElementApi.isElement(line)
              ? inline(line.children)
                  .map((leaf) => ('text' in leaf ? leaf.text : ''))
                  .join('')
              : line.text
          )
          .join('\n'),
      };
    }

    const children = inline(node.children);

    if (node.listStyleType) {
      return {
        type: 'list-item',
        variant: node.listStyleType === 'decimal' ? 'ordered' : 'unordered',
        indent: Math.max(0, Number(node.indent ?? 1) - 1),
        children,
      };
    }
    return { type: node.type === 'blockquote' ? 'blockquote' : 'p', children };
  });

  return normalizeReviewText({ version: 1, children });
}
