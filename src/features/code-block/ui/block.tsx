import { useEffect, useState } from 'react';

import { cn } from '@/shadcn/lib/utils';
import { CodeBlockCopyBtn } from '@/features/code-block/ui/copy-button';
import { highlightCode } from '@/features/code-block/model/highlight';
import { getCodeLanguageBadge } from '@/features/code-block/model/languages';

export type CodeBlockProps = {
  code: string;
  language?: string;
  fileName?: string;
};

// TODO: Remove this constants
const codeBlockClassName = cn(
  'code-block my-4 overflow-hidden rounded-2xl',
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

type CodeBlockBodyProps = {
  code: string;
  language?: string;
};

function CodeBlockBody({ code, language }: CodeBlockBodyProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    // Shiki highlighting is asynchronous. While a request is pending, this
    // component can receive new code/language props or unmount. React runs the
    // cleanup of the previous effect before starting the next one, so this flag
    // prevents stale highlight results from overwriting newer state.
    let isCurrent = true;

    highlightCode(code, language).then((result) => {
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

export function CodeBlock({ code, language, fileName }: CodeBlockProps) {
  const displayFileName = fileName ?? 'Фрагмент кода';
  const codeBodyKey = `${language ?? 'plain'}\u0000${code}`;
  const languageBadge = getCodeLanguageBadge(language);

  return (
    <figure className={codeBlockClassName}>
      <figcaption className={captionClassName}>
        <div className="flex min-w-0 items-center gap-2">
          {languageBadge && (
            <span className={languageBadgeClassName}>{languageBadge}</span>
          )}
          <span className="truncate">{displayFileName}</span>
        </div>

        <CodeBlockCopyBtn code={code} />
      </figcaption>

      <CodeBlockBody key={codeBodyKey} code={code} language={language} />
    </figure>
  );
}
