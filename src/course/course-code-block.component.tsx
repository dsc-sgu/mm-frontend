import { useEffect, useState } from 'react';

import { cn } from '@/shadcn/lib/utils';
import { CourseCodeBlockCopyBtn } from './course-code-block-copy-btn.component';
import { highlightCourseCode } from './course-code-block.shiki';
import type { CourseCodeBlockProps } from './course-code-block.types';

const codeBlockClassName = cn(
  'course-code-block my-4 overflow-hidden rounded-2xl',
  'border border-border bg-slate-50 text-slate-950',
  'dark:bg-zinc-950/90 dark:text-zinc-50'
);

const captionClassName = cn(
  'flex items-center justify-between gap-4 border-b px-4 py-2',
  'border-black/10 text-xs text-slate-600',
  'dark:border-white/10 dark:text-zinc-300'
);

const languageBadgeClassName = cn(
  'shrink-0 rounded-full px-2 py-0.5 uppercase tracking-wide',
  'bg-black/5 text-slate-600',
  'dark:bg-white/10 dark:text-zinc-300'
);

const highlightedCodeClassName = cn(
  '[&>pre]:overflow-x-auto [&>pre]:!bg-transparent [&>pre]:p-4',
  '[&>pre]:text-sm [&>pre]:leading-7',
  '[&>pre]:[-webkit-text-size-adjust:none]'
);

type CourseCodeBlockBodyProps = Pick<CourseCodeBlockProps, 'code' | 'language'>;

function CourseCodeBlockBody({ code, language }: CourseCodeBlockBodyProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    // Shiki highlighting is asynchronous. While a request is pending, this
    // component can receive new code/language props or unmount. React runs the
    // cleanup of the previous effect before starting the next one, so this flag
    // prevents stale highlight results from overwriting newer state.
    let isCurrent = true;

    highlightCourseCode(code, language).then((result) => {
      if (!isCurrent) {
        return;
      }

      setHighlightedHtml(result.status === 'highlighted' ? result.html : null);
    });

    return () => {
      isCurrent = false;
    };
  }, [code, language]);

  if (highlightedHtml) {
    return (
      <div
        className={highlightedCodeClassName}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    );
  }

  return (
    <pre className="overflow-x-auto p-4 text-sm leading-7">
      <code>{code}</code>
    </pre>
  );
}

export function CourseCodeBlock({
  code,
  language,
  fileName,
}: CourseCodeBlockProps) {
  const displayFileName = fileName ?? 'Фрагмент кода';
  const codeBodyKey = `${language ?? 'plain'}\u0000${code}`;

  return (
    <figure className={codeBlockClassName}>
      <figcaption className={captionClassName}>
        <div className="flex min-w-0 items-center gap-2">
          {language && (
            <span className={languageBadgeClassName}>{language}</span>
          )}
          <span className="truncate">{displayFileName}</span>
        </div>

        <CourseCodeBlockCopyBtn code={code} />
      </figcaption>

      <CourseCodeBlockBody key={codeBodyKey} code={code} language={language} />
    </figure>
  );
}
