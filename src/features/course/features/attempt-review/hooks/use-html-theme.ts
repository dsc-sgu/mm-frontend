import { useSyncExternalStore } from 'react';

export type HtmlThemeType = 'light' | 'dark';

function getHtmlThemeType(): HtmlThemeType {
  if (typeof document === 'undefined') {
    return 'light';
  }

  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribeToHtmlThemeClassChange(onStoreChange: () => void) {
  if (
    typeof document === 'undefined' ||
    typeof MutationObserver === 'undefined'
  ) {
    return () => {};
  }

  const observer = new MutationObserver(onStoreChange);

  observer.observe(document.documentElement, {
    attributeFilter: ['class'],
    attributes: true,
  });

  return () => observer.disconnect();
}

export function useHtmlThemeType(): HtmlThemeType {
  return useSyncExternalStore<HtmlThemeType>(
    subscribeToHtmlThemeClassChange,
    getHtmlThemeType,
    () => 'light'
  );
}
