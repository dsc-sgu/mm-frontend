import { sanitizeUrl } from '@braintree/sanitize-url';

/** A rejected href must not become a saved about:blank link. */
export function isSafeCourseHref(href: string) {
  return sanitizeUrl(href) !== 'about:blank';
}
