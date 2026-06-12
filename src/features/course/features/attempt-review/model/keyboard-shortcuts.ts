export function getAttemptReviewSubmitShortcutKeys(): string[] {
  return [isMacOs() ? '⌘' : 'Ctrl', '↵'];
}

export function getAttemptReviewCancelShortcutKeys(): string[] {
  return ['Esc'];
}

export function isAttemptReviewSubmitShortcutEvent(event: KeyboardEvent) {
  return (
    !event.isComposing &&
    event.key === 'Enter' &&
    (isMacOs() ? event.metaKey : event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  );
}

export function isAttemptReviewCancelShortcutEvent(event: KeyboardEvent) {
  return (
    !event.isComposing &&
    event.key === 'Escape' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey
  );
}

function isMacOs(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Mac|iPhone|iPad|iPod/i.test(
    `${navigator.platform} ${navigator.userAgent}`
  );
}
