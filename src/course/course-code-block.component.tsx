import { useEffect, useState } from 'react';

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

  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-border bg-zinc-950 text-zinc-50 shadow-sm dark:bg-zinc-950/90">
      {(fileName || language) && (
        <figcaption className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2 text-xs text-zinc-300">
          <span>{fileName ?? 'Фрагмент кода'}</span>
          {language && (
            <span className="uppercase tracking-wide">{language}</span>
          )}
        </figcaption>
      )}

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
