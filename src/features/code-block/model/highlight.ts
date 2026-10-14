async function createCodeBlockHighlighter() {
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

function cacheUntilRejected<T>(load: () => Promise<T>) {
  let promise: Promise<T> | null = null;

  return () => {
    promise ??= load().catch((error: unknown) => {
      promise = null;
      throw error;
    });

    return promise;
  };
}

const getCodeBlockHighlighter = cacheUntilRejected(createCodeBlockHighlighter);
const getBundledLanguages = cacheUntilRejected(() => import('shiki/langs'));

export type HighlightCodeResult =
  | {
      status: 'highlighted';
      html: string;
    }
  | {
      status: 'failed';
      reason: HighlightCodeFailureReason;
    };

type HighlightCodeFailureReason =
  | 'missing-language'
  | 'unsupported-language'
  | 'highlight-error';

const languageLoadPromises = new Map<string, Promise<boolean>>();

async function ensureLanguageLoaded(language: string) {
  const cachedPromise = languageLoadPromises.get(language);

  if (cachedPromise) {
    return cachedPromise;
  }

  const loadPromise = (async () => {
    const [{ bundledLanguages }, highlighter] = await Promise.all([
      getBundledLanguages(),
      getCodeBlockHighlighter(),
    ]);
    const loadLanguage =
      bundledLanguages[language as keyof typeof bundledLanguages];

    if (!loadLanguage) {
      return false;
    }

    await highlighter.loadLanguage(loadLanguage);
    return true;
  })().catch((error: unknown) => {
    languageLoadPromises.delete(language);
    throw error;
  });

  languageLoadPromises.set(language, loadPromise);
  return loadPromise;
}

export async function highlightCode(
  code: string,
  language?: string | null
): Promise<HighlightCodeResult> {
  if (!language) {
    return {
      status: 'failed',
      reason: 'missing-language',
    };
  }

  try {
    const isLanguageLoaded = await ensureLanguageLoaded(language);

    if (!isLanguageLoaded) {
      return {
        status: 'failed',
        reason: 'unsupported-language',
      };
    }

    const highlighter = await getCodeBlockHighlighter();
    const html = highlighter.codeToHtml(code, {
      lang: language,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'light',
    });

    return {
      status: 'highlighted',
      html,
    };
  } catch {
    return {
      status: 'failed',
      reason: 'highlight-error',
    };
  }
}
