import { describe, expect, test } from 'vitest';
import { apiPath } from './api-path';

const BASE = 'http://localhost';

function parse(path: string) {
  const url = new URL(path, BASE);
  return {
    origin: url.origin,
    segments: url.pathname.split('/').slice(1).map(decodeURIComponent),
    search: url.search,
    hash: url.hash,
  };
}

describe('apiPath', () => {
  test('a static path is a same-origin path under the API prefix', () => {
    expect(apiPath('auth', 'session')).toBe('/api/v1/auth/session');
  });

  test('nested segments keep their order', () => {
    expect(apiPath('courses', 'c-1', 'tasks', 't-2', 'attempts')).toBe(
      '/api/v1/courses/c-1/tasks/t-2/attempts'
    );
  });

  test('a numeric segment is rendered as its decimal string', () => {
    expect(apiPath('attempts', 'sasha', 3)).toBe('/api/v1/attempts/sasha/3');
  });

  test.each([
    [
      'unicode',
      'алгоритмы',
      '%D0%B0%D0%BB%D0%B3%D0%BE%D1%80%D0%B8%D1%82%D0%BC%D1%8B',
    ],
    ['space', 'a b', 'a%20b'],
    ['slash', 'a/b', 'a%2Fb'],
    ['question mark', 'a?b', 'a%3Fb'],
    ['hash', 'a#b', 'a%23b'],
    ['percent', '100%', '100%25'],
    ['pre-encoded text', 'a%2Fb', 'a%252Fb'],
  ])('%s is encoded inside one segment', (_, raw, encoded) => {
    expect(apiPath('courses', raw, 'tasks')).toBe(
      `/api/v1/courses/${encoded}/tasks`
    );
  });

  test('encoding never moves segment boundaries or creates a query or hash', () => {
    const raw = ['a/b', 'c?d=e', 'f#g', '50% off', 'ü ñ', '...'];

    expect(parse(apiPath('courses', ...raw))).toEqual({
      origin: BASE,
      segments: ['api', 'v1', 'courses', ...raw],
      search: '',
      hash: '',
    });
  });

  test.each(['', '.', '..'])(
    '%j is rejected because URL resolution would drop or collapse it',
    (segment) => {
      expect(() => apiPath('courses', segment, 'tasks')).toThrow(TypeError);
    }
  );
});
