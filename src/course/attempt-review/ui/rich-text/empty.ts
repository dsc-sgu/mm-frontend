export function isRichTextHtmlEmpty(html: string): boolean {
  const withoutTags = html
    .replace(/<br\s*\/?>(?=<\/p>)/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, '')
    .trim();

  return withoutTags.length === 0 && !/<img\s/i.test(html);
}
