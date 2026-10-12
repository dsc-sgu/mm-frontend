import DOMPurify from 'dompurify';

// Student Markdown may carry any raw HTML. Only document structure survives:
// no scripts, embeds or forms, and no `class`, `style` or `id`, which could
// restyle the review page or overlay its controls.
const ALLOWED_TAGS = [
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'code',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'ins',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'samp',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];

const ALLOWED_ATTR = [
  'align',
  'alt',
  'checked',
  'colspan',
  'disabled',
  'height',
  'href',
  'rowspan',
  'src',
  'start',
  'title',
  'type',
  'width',
];

// A relative link or image points into the student's repository, which the
// review page cannot serve, so only absolute addresses are kept. DOMPurify's
// own URI check still runs first; a custom ALLOWED_URI_REGEXP would instead
// apply to every attribute value, including `start` and `align`.
const ABSOLUTE_LINK = /^(?:https?|mailto):/i;
const ABSOLUTE_IMAGE = /^(?:https?:|data:image\/)/i;

export function sanitizeMarkdownHtml(html: string): string {
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    RETURN_DOM_FRAGMENT: true,
  });

  fragment.querySelectorAll('a').forEach((link) => {
    if (!ABSOLUTE_LINK.test(link.getAttribute('href') ?? '')) {
      link.removeAttribute('href');
      return;
    }

    // Following a link must not leave the review page with unsaved changes.
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
  fragment.querySelectorAll('img').forEach((image) => {
    if (!ABSOLUTE_IMAGE.test(image.getAttribute('src') ?? '')) {
      image.replaceWith(image.getAttribute('alt') ?? '');
      return;
    }

    image.setAttribute('loading', 'lazy');
    image.setAttribute('referrerpolicy', 'no-referrer');
  });
  fragment.querySelectorAll('input').forEach((input) => {
    if (input.getAttribute('type') !== 'checkbox') {
      input.remove();
      return;
    }

    input.setAttribute('disabled', '');
  });

  const container = document.createElement('div');
  container.append(fragment);

  return container.innerHTML.trim();
}
