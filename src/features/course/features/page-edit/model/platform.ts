export function isApplePlatform() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function getModKeyLabel() {
  return isApplePlatform() ? '⌘' : 'Ctrl';
}

export function getBackspaceKeyLabel() {
  return isApplePlatform() ? '⌫' : 'Backspace';
}
