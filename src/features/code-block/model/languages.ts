export type CodeLanguageOption = {
  aliases: string[];
  badge: string;
  label: string;
  searchValue: string;
  value: string;
};

type ShikiLanguageInfo = {
  aliases?: string[];
  id: string;
  name: string;
};

const preferredBadgeByLanguage: Record<string, string> = {
  javascript: 'JS',
  js: 'JS',
  jsx: 'JSX',
  python: 'PY',
  typescript: 'TS',
  ts: 'TS',
  tsx: 'TSX',
  markdown: 'MD',
};

let codeLanguageOptionsPromise: Promise<CodeLanguageOption[]> | null = null;

function getLanguageAliases(language: ShikiLanguageInfo) {
  return [language.id, ...(language.aliases ?? [])];
}

function createLanguageBadge(language: ShikiLanguageInfo) {
  const preferredBadge = preferredBadgeByLanguage[language.id];

  if (preferredBadge) {
    return preferredBadge;
  }

  const shortAlias = language.aliases?.find(
    (alias) => alias.length > 1 && alias.length <= 4
  );

  return (shortAlias ?? language.id).toUpperCase();
}

function createCodeLanguageOptions(languages: ShikiLanguageInfo[]) {
  return languages
    .map((language) => {
      const aliases = getLanguageAliases(language);

      return {
        aliases,
        badge: createLanguageBadge(language),
        label: language.name,
        searchValue: [language.name, ...aliases].join(' '),
        value: language.id,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function loadCodeLanguageOptions() {
  codeLanguageOptionsPromise ??= import('shiki/langs').then(
    ({ bundledLanguagesInfo }) =>
      createCodeLanguageOptions(bundledLanguagesInfo)
  );

  return codeLanguageOptionsPromise;
}

export function getCodeLanguageOptionFromOptions(
  options: CodeLanguageOption[],
  language?: string | null
) {
  if (!language) {
    return null;
  }

  return options.find((option) => option.aliases.includes(language)) ?? null;
}

export function getCodeLanguageBadge(language?: string | null) {
  if (!language) {
    return null;
  }

  const preferredBadge = preferredBadgeByLanguage[language];

  if (preferredBadge) {
    return preferredBadge;
  }

  return language.toUpperCase();
}
