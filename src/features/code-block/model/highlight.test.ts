import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadTypeScript = vi.hoisted(() => vi.fn());

vi.mock('shiki/langs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('shiki/langs')>();

  return {
    ...actual,
    bundledLanguages: {
      ...actual.bundledLanguages,
      typescript: loadTypeScript,
    },
  };
});

async function importHighlightCode() {
  const [{ highlightCode }, { bundledLanguages }] = await Promise.all([
    import('./highlight'),
    vi.importActual<typeof import('shiki/langs')>('shiki/langs'),
  ]);

  return { highlightCode, loadActualTypeScript: bundledLanguages.typescript };
}

describe('highlightCode', () => {
  beforeEach(() => {
    vi.resetModules();
    loadTypeScript.mockReset();
  });

  it('loads a language again after its previous load failed', async () => {
    const { highlightCode, loadActualTypeScript } = await importHighlightCode();
    loadTypeScript
      .mockRejectedValueOnce(new Error('Failed to fetch chunk'))
      .mockImplementation(loadActualTypeScript);

    await expect(highlightCode('const a = 1;', 'typescript')).resolves.toEqual({
      status: 'failed',
      reason: 'highlight-error',
    });
    await expect(
      highlightCode('const a = 1;', 'typescript')
    ).resolves.toMatchObject({ status: 'highlighted' });
    expect(loadTypeScript).toHaveBeenCalledTimes(2);
  });

  it('loads a language once for parallel highlights', async () => {
    const { highlightCode, loadActualTypeScript } = await importHighlightCode();
    loadTypeScript.mockImplementation(loadActualTypeScript);

    const results = await Promise.all([
      highlightCode('const a = 1;', 'typescript'),
      highlightCode('const b = 2;', 'typescript'),
    ]);

    expect(results).toMatchObject([
      { status: 'highlighted' },
      { status: 'highlighted' },
    ]);

    await highlightCode('const c = 3;', 'typescript');
    expect(loadTypeScript).toHaveBeenCalledTimes(1);
  });
});
