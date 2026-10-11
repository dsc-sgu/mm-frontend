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

export function getModKeyLabel() {
  return isApplePlatform() ? '⌘' : 'Ctrl';
}

function isApplePlatform() {
  return (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  );
}
