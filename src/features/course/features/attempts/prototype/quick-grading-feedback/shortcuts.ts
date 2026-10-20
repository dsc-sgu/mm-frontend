// PROTOTYPE (#121): quick-grading session shortcuts, in the style of
// attempt-review/model/keyboard-shortcuts.ts. Mod+S matches the physical key
// (`code`), so it also works on the Russian layout where `key` is "ы".
export function isSaveShortcut(event: KeyboardEvent) {
  return (
    !event.isComposing &&
    event.code === 'KeyS' &&
    (isApplePlatform() ? event.metaKey : event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  );
}

// A popover or drawer that closes on Escape marks the event as handled
// (Radix DismissableLayer), so Esc leaves the session only when nothing else
// consumed it.
export function isExitShortcut(event: KeyboardEvent) {
  return (
    !event.isComposing &&
    !event.defaultPrevented &&
    event.key === 'Escape' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey
  );
}

// Mod+Enter applies filters, as in the current sidebar.
export function isApplyShortcut(
  event: Pick<
    KeyboardEvent,
    'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'
  >
) {
  return (
    event.key === 'Enter' &&
    (isApplePlatform() ? event.metaKey : event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  );
}

// Alt+G ("grading") toggles quick grading: it starts the session from
// normal mode and leaves it like Esc. Mod+G is the browser's "find next", and
// a bare letter is too easy to hit by accident. Matches the physical key, so
// it works on the Russian layout ("п") and from inside a grade field.
export function isQuickGradingToggleShortcut(event: KeyboardEvent) {
  return (
    !event.isComposing &&
    event.code === 'KeyG' &&
    event.altKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey
  );
}

export function getModKeyLabel() {
  return isApplePlatform() ? '⌘' : 'Ctrl';
}

export function getAltKeyLabel() {
  return isApplePlatform() ? '⌥' : 'Alt';
}

function isApplePlatform() {
  return (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  );
}
