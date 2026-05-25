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

const copyButtonClassName = cn(
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5',
  'rounded-lg border px-2.5 py-1 text-xs font-medium',
  'border-black/10 bg-white text-slate-700 transition-colors',
  'hover:bg-slate-100 focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-slate-400/40',
  'dark:border-white/10 dark:bg-white/5 dark:text-zinc-200',
  'dark:hover:bg-white/10 dark:focus-visible:ring-white/40'
);

const highlightedCodeClassName = cn(
  '[&>pre]:overflow-x-auto [&>pre]:!bg-transparent [&>pre]:p-4',
  '[&>pre]:text-sm [&>pre]:leading-7',
  '[&>pre]:[-webkit-text-size-adjust:none]'
);

async function createCourseHighlighter() {
  const [
    { createHighlighterCore },
    { createJavaScriptRegexEngine },
    githubDark,
    githubLight,
  ] = await Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('@shikijs/themes/github-dark'),
    import('@shikijs/themes/github-light'),
  ]);

  return createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    themes: [githubDark.default, githubLight.default],
    langs: [],
  });
}

let highlighterPromise: ReturnType<typeof createCourseHighlighter> | null =
  null;
let bundledLanguagesPromise: Promise<typeof import('shiki/langs')> | null =
  null;

const languageLoadPromises = new Map<string, Promise<boolean>>();

function getCourseHighlighter() {
  highlighterPromise ??= createCourseHighlighter();
  return highlighterPromise;
}

function getBundledLanguages() {
  bundledLanguagesPromise ??= import('shiki/langs');
  return bundledLanguagesPromise;
}

function normalizeLanguage(language?: string): string | null {
  const normalized = language?.trim().toLowerCase();
  return normalized || null;
}

async function ensureLanguageLoaded(language: string) {
  const cachedPromise = languageLoadPromises.get(language);

  if (cachedPromise) {
    return cachedPromise;
  }

  const loadPromise = (async () => {
    const [{ bundledLanguages }, highlighter] = await Promise.all([
      getBundledLanguages(),
      getCourseHighlighter(),
    ]);
    const loadLanguage =
      bundledLanguages[language as keyof typeof bundledLanguages];

    if (!loadLanguage) {
      return false;
    }

    await highlighter.loadLanguage(loadLanguage);
    return true;
  })();

  languageLoadPromises.set(language, loadPromise);
  return loadPromise;
}

async function highlightCode(code: string, language: string | null) {
  if (!language) {
    return null;
  }

  try {
    const isLanguageLoaded = await ensureLanguageLoaded(language);

    if (!isLanguageLoaded) {
      return null;
    }

    const highlighter = await getCourseHighlighter();

    return highlighter.codeToHtml(code, {
      lang: language,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'light',
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
  const normalizedLanguage = normalizeLanguage(language);
  const displayFileName = fileName ?? 'Фрагмент кода';
  const highlightKey = `${normalizedLanguage ?? 'plain'}\u0000${code}`;
  const highlightedHtml =
    highlightResult?.key === highlightKey ? highlightResult.html : null;

  useEffect(() => {
    let isMounted = true;

    highlightCode(code, normalizedLanguage).then((html) => {
      if (isMounted) {
        setHighlightResult({ key: highlightKey, html });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [code, highlightKey, normalizedLanguage]);

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
    <figure className={codeBlockClassName}>
      <figcaption className={captionClassName}>
        <div className="flex min-w-0 items-center gap-2">
          {language && (
            <span className={languageBadgeClassName}>{language}</span>
          )}
          <span className="truncate">{displayFileName}</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={copyButtonClassName}
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
          className={highlightedCodeClassName}
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
