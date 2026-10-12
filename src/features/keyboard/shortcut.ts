// A letter matches the character it types in a Latin layout, the way the
// shortcuts of the OS do, so the label is right in Dvorak or AZERTY too. When
// the key types no Latin letter (the Russian layout, an Option symbol or a
// dead key on macOS), the physical key (`KeyboardEvent.code`) decides. The
// rule and its sources are recorded in #147.
type Letter =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';

type NamedKey = 'Enter' | 'Escape';

type ShortcutKey = Letter | NamedKey;

// Mod is Meta or Ctrl on every platform. A modifier that is not listed must
// not be held; Shift never takes part in a shortcut.
export type Shortcut = {
  key: ShortcutKey;
  mod?: boolean;
  alt?: boolean;
};

// React handlers pass `event.nativeEvent`: synthetic events lack `isComposing`.
export type ShortcutEvent = Pick<
  KeyboardEvent,
  'altKey' | 'code' | 'ctrlKey' | 'isComposing' | 'key' | 'metaKey' | 'shiftKey'
>;

export function matchesShortcut(event: ShortcutEvent, shortcut: Shortcut) {
  return (
    !event.isComposing &&
    (event.metaKey || event.ctrlKey) === (shortcut.mod ?? false) &&
    event.altKey === (shortcut.alt ?? false) &&
    !event.shiftKey &&
    matchesKey(event, shortcut.key)
  );
}

const LATIN_LETTER = /^[a-z]$/i;

function matchesKey(event: ShortcutEvent, key: ShortcutKey) {
  if (!isLetter(key)) {
    return event.key === key;
  }

  if (LATIN_LETTER.test(event.key)) {
    return event.key.toUpperCase() === key;
  }

  return event.code === `Key${key}`;
}

function isLetter(key: ShortcutKey): key is Letter {
  return key.length === 1;
}

const NAMED_KEY_LABELS: Record<NamedKey, string> = {
  Enter: '↵',
  Escape: 'Esc',
};

export function getShortcutLabels(shortcut: Shortcut) {
  const keyLabel = isLetter(shortcut.key)
    ? shortcut.key
    : NAMED_KEY_LABELS[shortcut.key];

  if (isApplePlatform()) {
    return [
      ...(shortcut.alt ? ['⌥'] : []),
      ...(shortcut.mod ? ['⌘'] : []),
      keyLabel,
    ];
  }

  return [
    ...(shortcut.mod ? ['Ctrl'] : []),
    ...(shortcut.alt ? ['Alt'] : []),
    keyLabel,
  ];
}

// The platform only picks labels; matching never depends on it.
// `navigator.platform` wins because WebKitGTK sends a macOS user agent on
// Linux; the user agent covers an empty platform.
function isApplePlatform() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}
