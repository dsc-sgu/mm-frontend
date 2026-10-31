import { sanitizeUrl } from '@braintree/sanitize-url';

const RELATIVE_BASE = 'https://course.invalid/';
export const COURSE_LINK_SCHEMES = ['http', 'https', 'mailto', 'tel'];
const ALLOWED_PROTOCOLS = new Set(
  COURSE_LINK_SCHEMES.map((scheme) => `${scheme}:`)
);

function isRelativeCourseHref(href: string) {
  return href.startsWith('/') || href.startsWith('#');
}

function parseCourseHref(href: string): URL | null {
  try {
    return new URL(
      href,
      isRelativeCourseHref(href) ? RELATIVE_BASE : undefined
    );
  } catch {
    return null;
  }
}

/** Validate the original href without saving the sanitizer's replacement URL. */
export function isSafeCourseHref(href: string) {
  if (/\s/u.test(href)) return false;
  const sanitized = sanitizeUrl(href);
  if (sanitized === 'about:blank') return false;
  const url = parseCourseHref(href);
  if (!url) return false;
  if (isRelativeCourseHref(href)) {
    return (
      !sanitized.startsWith('//') &&
      !sanitized.startsWith('/\\') &&
      url.origin === new URL(RELATIVE_BASE).origin
    );
  }
  return ALLOWED_PROTOCOLS.has(url.protocol);
}

/** Absolute HTTP(S) links open in a new tab. */
export function isExternalCourseHref(href: string) {
  if (isRelativeCourseHref(href)) return false;
  const url = parseCourseHref(href);
  return url?.protocol === 'http:' || url?.protocol === 'https:';
}
