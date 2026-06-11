import { cn } from '@/shadcn/lib/utils';
import { sanitizeRichTextHtml } from './sanitize';

export function RichTextContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Нет сохранённого текста.
      </p>
    );
  }

  return (
    <div
      className={cn(
        'attempt-review-editor-readonly prose prose-sm max-w-none font-sans dark:prose-invert',
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(html) }}
    />
  );
}
