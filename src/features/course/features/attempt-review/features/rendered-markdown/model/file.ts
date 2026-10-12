export type MarkdownFileView = 'source' | 'rendered';

// MDX embeds JSX, so its source cannot be rendered as plain Markdown.
const MARKDOWN_EXTENSIONS = new Set([
  'md',
  'markdown',
  'mdown',
  'mkd',
  'mkdn',
  'mdwn',
]);

export function isMarkdownFile(path: string): boolean {
  const fileName = path.slice(path.lastIndexOf('/') + 1);
  const extensionStart = fileName.lastIndexOf('.');

  if (extensionStart === -1) {
    return false;
  }

  return MARKDOWN_EXTENSIONS.has(
    fileName.slice(extensionStart + 1).toLowerCase()
  );
}
