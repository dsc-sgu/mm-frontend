import type { ReviewTextLeaf } from '@/features/course/features/review/model/text-document';
import DOMPurify from 'dompurify';
import type { Value } from 'platejs';
import { isSafeReviewHref } from '@/features/course/model/links';

/** HTML is accepted only at this clipboard boundary. */
export function reviewClipboardHtml(html: string): Value {
  const root = document.createElement('div');
  root.innerHTML = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'style', 'img'],
    ALLOWED_ATTR: ['href'],
  });

  type Leaf = ReviewTextLeaf;

  function inline(
    node: Node,
    marks: Omit<Leaf, 'text'> = {}
  ): Value[number]['children'] {
    if (node.nodeType === Node.TEXT_NODE)
      return [{ text: node.textContent ?? '', ...marks }];
    if (!(node instanceof HTMLElement)) return [];
    if (node.tagName === 'BR') return [{ text: '\n', ...marks }];

    const mark = (
      {
        STRONG: 'bold',
        B: 'bold',
        EM: 'italic',
        I: 'italic',
        S: 'strikethrough',
        DEL: 'strikethrough',
        CODE: 'code',
      } as const
    )[node.tagName as 'B'];
    const children = Array.from(node.childNodes).flatMap((child) =>
      inline(child, mark ? { ...marks, [mark]: true } : marks)
    );
    const url = node.getAttribute('href');
    if (node.tagName === 'A' && url && isSafeReviewHref(url))
      return [{ type: 'a', url, children }];

    return children;
  }

  const blocks: Value = [];

  function visit(parent: HTMLElement, indent = 0) {
    let pending: Value[number]['children'] = [];

    function flush() {
      if (pending.length) blocks.push({ type: 'p', children: pending });
      pending = [];
    }

    for (const child of parent.childNodes) {
      if (!(child instanceof HTMLElement)) {
        pending.push(...inline(child));
        continue;
      }
      if (/^(UL|OL)$/.test(child.tagName)) {
        flush();
        for (const li of child.children) {
          const content = Array.from(li.childNodes)
            .filter(
              (n) => !(n instanceof HTMLElement && /^(UL|OL)$/.test(n.tagName))
            )
            .flatMap((n) => inline(n));

          blocks.push({
            type: 'p',
            listStyleType: child.tagName === 'OL' ? 'decimal' : 'disc',
            indent: indent + 1,
            children: content.length ? content : [{ text: '' }],
          });

          for (const nested of li.children)
            if (/^(UL|OL)$/.test(nested.tagName)) {
              const wrapper = document.createElement('div');
              wrapper.append(nested.cloneNode(true));
              visit(wrapper, indent + 1);
            }
        }
      } else if (child.tagName === 'PRE') {
        flush();
        blocks.push({
          type: 'code_block',
          children: (child.textContent ?? '')
            .split('\n')
            .map((text) => ({ type: 'code_line', children: [{ text }] })),
        });
      } else if (child.tagName === 'DIV') {
        flush();
        visit(child, indent);
      } else if (/^(P|BLOCKQUOTE|H[1-6])$/.test(child.tagName)) {
        flush();
        blocks.push({
          type: child.tagName === 'BLOCKQUOTE' ? 'blockquote' : 'p',
          children: inline(child),
        });
      } else pending.push(...inline(child));
    }

    flush();
  }

  visit(root);

  return blocks;
}
