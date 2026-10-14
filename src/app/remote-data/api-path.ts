const API_PREFIX = '/api/v1';

/**
 * Builds a same-origin backend API path from raw, unencoded segments.
 *
 * Each segment is percent-encoded on its own, so `/`, `?`, `#` and `%` inside
 * a value never change segment boundaries or create a query or hash.
 *
 * Throws for empty and dot segments: URL resolution drops or collapses them
 * even when encoded, so the request would reach a different endpoint.
 *
 * @example
 * ```ts
 * apiPath('courses', courseId, 'repositories', studentUsername);
 * ```
 */
export function apiPath(...segments: (string | number)[]): string {
  const encoded = segments.map((segment) => {
    const raw = String(segment);
    if (raw === '' || raw === '.' || raw === '..') {
      throw new TypeError(`Invalid API path segment: ${JSON.stringify(raw)}`);
    }
    return encodeURIComponent(raw);
  });
  return [API_PREFIX, ...encoded].join('/');
}
