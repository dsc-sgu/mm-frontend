import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';

type CourseCodeBlockProps = {
  code: string;
  language?: string;
  fileName?: string;
};

type HighlightResult = {
  key: string;
  html: string | null;
};

type CopyState = 'idle' | 'copied' | 'failed';

type SupportedLanguage =
  | 'bash'
  | 'css'
  | 'html'
  | 'javascript'
  | 'json'
  | 'jsx'
  | 'markdown'
  | 'python'
  | 'tsx'
  | 'typescript'
  | 'yaml';

const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  bash: 'bash',
  css: 'css',
  html: 'html',
  js: 'javascript',
  javascript: 'javascript',
  json: 'json',
  jsx: 'jsx',
  markdown: 'markdown',
  md: 'markdown',
  py: 'python',
  python: 'python',
  shell: 'bash',
  sh: 'bash',
  ts: 'typescript',
  tsx: 'tsx',
  typescript: 'typescript',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'bash',
};

async function createCourseHighlighter() {
  const [
    { createHighlighterCore },
    { createJavaScriptRegexEngine },
    githubDark,
    bash,
    css,
    html,
    javascript,
    json,
    jsx,
    markdown,
    python,
    tsx,
    typescript,
    yaml,
  ] = await Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('@shikijs/themes/github-dark'),
    import('@shikijs/langs/bash'),
    import('@shikijs/langs/css'),
    import('@shikijs/langs/html'),
    import('@shikijs/langs/javascript'),
    import('@shikijs/langs/json'),
    import('@shikijs/langs/jsx'),
    import('@shikijs/langs/markdown'),
    import('@shikijs/langs/python'),
    import('@shikijs/langs/tsx'),
    import('@shikijs/langs/typescript'),
    import('@shikijs/langs/yaml'),
  ]);

  return createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    themes: [githubDark.default],
    langs: [
      bash.default,
      css.default,
      html.default,
      javascript.default,
      json.default,
      jsx.default,
      markdown.default,
      python.default,
      tsx.default,
      typescript.default,
      yaml.default,
    ],
  });
}

let highlighterPromise: ReturnType<typeof createCourseHighlighter> | null =
  null;

function getCourseHighlighter() {
  highlighterPromise ??= createCourseHighlighter();
  return highlighterPromise;
}

function getSupportedLanguage(language?: string): SupportedLanguage | null {
  if (!language) {
    return null;
  }

  const normalized = language.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return LANGUAGE_ALIASES[normalized] ?? null;
}

async function highlightCode(code: string, language: SupportedLanguage | null) {
  if (!language) {
    return null;
  }

  try {
    const highlighter = await getCourseHighlighter();

    return highlighter.codeToHtml(code, {
      lang: language,
      theme: 'github-dark',
    });
  } catch {
    return null;
  }
}

export function CourseCodeBlock({
  code,
  language,
  fileName,
}: CourseCodeBlockProps) {
  const [highlightResult, setHighlightResult] =
    useState<HighlightResult | null>(null);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const copyResetTimeoutRef = useRef<number | null>(null);
  const supportedLanguage = getSupportedLanguage(language);
  const highlightKey = `${supportedLanguage ?? 'plain'}\u0000${code}`;
  const highlightedHtml =
    highlightResult?.key === highlightKey ? highlightResult.html : null;

  useEffect(() => {
    let isMounted = true;

    highlightCode(code, supportedLanguage).then((html) => {
      if (isMounted) {
        setHighlightResult({ key: highlightKey, html });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [code, highlightKey, supportedLanguage]);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }

    copyResetTimeoutRef.current = window.setTimeout(() => {
      setCopyState('idle');
      copyResetTimeoutRef.current = null;
    }, 1400);
  }

  return (
    <figure className="my-4 overflow-hidden rounded-2xl border border-border bg-zinc-950 text-zinc-50 shadow-sm dark:bg-zinc-950/90">
      <figcaption className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2 text-xs text-zinc-300">
        <div className="flex min-w-0 items-center gap-2">
          {language && (
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 uppercase tracking-wide text-zinc-300">
              {language}
            </span>
          )}
          <span className="truncate">{fileName ?? 'Фрагмент кода'}</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="cursor-pointer inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Скопировать код"
        >
          {copyState === 'copied' ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copyState === 'copied'
            ? 'Скопировано'
            : copyState === 'failed'
              ? 'Не удалось'
              : 'Скопировать'}
        </button>
      </figcaption>

      {highlightedHtml ? (
        <div
          className={cn(
            '[&>pre]:overflow-x-auto [&>pre]:!bg-transparent [&>pre]:p-4',
            '[&>pre]:text-sm [&>pre]:leading-7 [&>pre]:[-webkit-text-size-adjust:none]'
          )}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-sm leading-7">
          <code>{code}</code>
        </pre>
      )}
    </figure>
  );
}
