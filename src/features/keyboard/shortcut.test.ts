import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  getShortcutLabels,
  matchesShortcut,
  type Shortcut,
  type ShortcutEvent,
} from '@/features/keyboard/shortcut';

function keydown(
  init: Pick<ShortcutEvent, 'key' | 'code'> & Partial<ShortcutEvent>
): ShortcutEvent {
  return {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    ...init,
  };
}

const save: Shortcut = { mod: true, key: 'S' };

describe('matchesShortcut', () => {
  test.each([
    ['Ctrl+S', keydown({ key: 's', code: 'KeyS', ctrlKey: true })],
    ['Cmd+S', keydown({ key: 's', code: 'KeyS', metaKey: true })],
    [
      'Ctrl+S with Caps Lock on',
      keydown({ key: 'S', code: 'KeyS', ctrlKey: true }),
    ],
    [
      'Ctrl+S in the Russian layout, on the key that types "ы"',
      keydown({ key: 'ы', code: 'KeyS', ctrlKey: true }),
    ],
    [
      'Ctrl+S in Dvorak, on the key that types "s"',
      keydown({ key: 's', code: 'Semicolon', ctrlKey: true }),
    ],
  ])('Mod+S matches %s', (_name, event) => {
    expect(matchesShortcut(event, save)).toBe(true);
  });

  test.each([
    ['plain S', keydown({ key: 's', code: 'KeyS' })],
    [
      'AltGr+S, reported as Ctrl+Alt',
      keydown({ key: 'ś', code: 'KeyS', ctrlKey: true, altKey: true }),
    ],
    [
      'Ctrl+Shift+S',
      keydown({ key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true }),
    ],
    [
      'Ctrl in Dvorak on the QWERTY S position, which types "o"',
      keydown({ key: 'o', code: 'KeyS', ctrlKey: true }),
    ],
    [
      'Ctrl+S during IME composition',
      keydown({ key: 's', code: 'KeyS', ctrlKey: true, isComposing: true }),
    ],
  ])('Mod+S does not match %s', (_name, event) => {
    expect(matchesShortcut(event, save)).toBe(false);
  });

  test.each([
    [
      'Ctrl+Enter',
      keydown({ key: 'Enter', code: 'Enter', ctrlKey: true }),
      true,
    ],
    [
      'Cmd+Enter on the numpad',
      keydown({ key: 'Enter', code: 'NumpadEnter', metaKey: true }),
      true,
    ],
    ['plain Enter', keydown({ key: 'Enter', code: 'Enter' }), false],
  ])('Mod+Enter against %s', (_name, event, matches) => {
    expect(matchesShortcut(event, { mod: true, key: 'Enter' })).toBe(matches);
  });

  test.each([
    ['Esc', keydown({ key: 'Escape', code: 'Escape' }), true],
    [
      'Ctrl+Esc',
      keydown({ key: 'Escape', code: 'Escape', ctrlKey: true }),
      false,
    ],
  ])('Esc against %s', (_name, event, matches) => {
    expect(matchesShortcut(event, { key: 'Escape' })).toBe(matches);
  });

  test.each([
    [
      'Option+G on macOS',
      keydown({ key: '©', code: 'KeyG', altKey: true }),
      true,
    ],
    [
      'Alt+G in the Russian layout',
      keydown({ key: 'п', code: 'KeyG', altKey: true }),
      true,
    ],
    ['plain G', keydown({ key: 'g', code: 'KeyG' }), false],
    [
      'AltGr+G, reported as Ctrl+Alt',
      keydown({ key: 'g', code: 'KeyG', ctrlKey: true, altKey: true }),
      false,
    ],
  ])('Alt+G against %s', (_name, event, matches) => {
    expect(matchesShortcut(event, { alt: true, key: 'G' })).toBe(matches);
  });

  test('Alt+E matches Option+E on macOS, which is a dead key', () => {
    const event = keydown({ key: 'Dead', code: 'KeyE', altKey: true });

    expect(matchesShortcut(event, { alt: true, key: 'E' })).toBe(true);
  });
});

const MAC = { platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh)' };
const WINDOWS = { platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT)' };

describe('getShortcutLabels', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test.each([
    ['macOS', MAC, ['⌘', 'S']],
    ['Windows', WINDOWS, ['Ctrl', 'S']],
  ])('labels Mod+S on %s', (_name, navigator, labels) => {
    vi.stubGlobal('navigator', navigator);

    expect(getShortcutLabels(save)).toEqual(labels);
  });

  test.each<[string, Shortcut, string[], string[]]>([
    ['Mod+Enter', { mod: true, key: 'Enter' }, ['⌘', '↵'], ['Ctrl', '↵']],
    ['Esc', { key: 'Escape' }, ['Esc'], ['Esc']],
    ['Alt+G', { alt: true, key: 'G' }, ['⌥', 'G'], ['Alt', 'G']],
    [
      'Mod+Alt+K',
      { mod: true, alt: true, key: 'K' },
      ['⌥', '⌘', 'K'],
      ['Ctrl', 'Alt', 'K'],
    ],
  ])('labels %s on macOS and Windows', (_name, shortcut, mac, windows) => {
    vi.stubGlobal('navigator', MAC);
    expect(getShortcutLabels(shortcut)).toEqual(mac);

    vi.stubGlobal('navigator', WINDOWS);
    expect(getShortcutLabels(shortcut)).toEqual(windows);
  });

  test.each([
    ['iPhone', { platform: 'iPhone', userAgent: 'Mozilla/5.0 (iPhone)' }, '⌘'],
    [
      'macOS with an empty navigator.platform',
      { platform: '', userAgent: 'Mozilla/5.0 (Macintosh)' },
      '⌘',
    ],
    [
      'Linux',
      { platform: 'Linux x86_64', userAgent: 'Mozilla/5.0 (X11; Linux)' },
      'Ctrl',
    ],
    [
      'WebKitGTK on Linux, which sends a macOS user agent',
      { platform: 'Linux x86_64', userAgent: 'Mozilla/5.0 (Macintosh)' },
      'Ctrl',
    ],
    [
      'Android',
      { platform: 'Linux armv81', userAgent: 'Mozilla/5.0 (Linux; Android)' },
      'Ctrl',
    ],
  ])('labels Mod on %s', (_name, navigator, mod) => {
    vi.stubGlobal('navigator', navigator);

    expect(getShortcutLabels(save)).toEqual([mod, 'S']);
  });
});
