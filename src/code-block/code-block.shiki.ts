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

let highlighterPromise: ReturnType<typeof createCodeBlockHighlighter> | null =
  null;
let bundledLanguagesPromise: Promise<typeof import('shiki/langs')> | null =
  null;

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

function getCodeBlockHighlighter() {
  highlighterPromise ??= createCodeBlockHighlighter();
  return highlighterPromise;
}

function getBundledLanguages() {
  bundledLanguagesPromise ??= import('shiki/langs');
  return bundledLanguagesPromise;
}

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
  })();

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
