import { sanitizeUrl } from '@braintree/sanitize-url';

export function isSafeCourseHref(href: string) {
  return sanitizeUrl(href) !== 'about:blank';
}

/** Only absolute web URLs and paths rooted in this application are links. */
export function isSafeReviewHref(href: string): boolean {
  if (
    /\s|\\/u.test(href) ||
    [...href].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
    )
  ) {
    return false;
  }
  if (href.startsWith('/')) {
    return !href.startsWith('//');
  }
  if (!/^https?:\/\//iu.test(href)) {
    return false;
  }
  try {
    const url = new URL(href);
    return Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
