import { getBackspaceKeyLabel, getModKeyLabel } from './platform';

type KeyboardLikeEvent = Pick<
  KeyboardEvent,
  'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'
>;

type ShortcutOptions = {
  alt?: boolean;
  shift?: boolean;
};

export type ShortcutToken =
  | 'mod'
  | 'shift'
  | 'alt'
  | 'enter'
  | 'escape'
  | 'backspace'
  | string;

export function isModShortcut(
  event: KeyboardLikeEvent,
  key: string,
  options: ShortcutOptions = {}
) {
  return (
    (event.metaKey || event.ctrlKey) &&
    event.altKey === (options.alt ?? false) &&
    event.shiftKey === (options.shift ?? false) &&
    event.key.toLowerCase() === key.toLowerCase()
  );
}

export function isSingleKeyShortcut(event: KeyboardLikeEvent, key: string) {
  return (
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === key.toLowerCase()
  );
}

export function isBackspacehortcut(event: KeyboardLikeEvent) {
  return (
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    event.key === 'Backspace'
  );
}

export function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();

  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

export function isBlockOnlyShortcutAllowed(event: KeyboardEvent) {
  return !isTextEditingTarget(event.target);
}

export function getShortcutTokenLabel(token: ShortcutToken) {
  switch (token) {
    case 'mod':
      return getModKeyLabel();
    case 'shift':
      return '⇧';
    case 'alt':
      return 'Alt';
    case 'enter':
      return 'Enter';
    case 'escape':
      return 'Esc';
    case 'backspace':
      return getBackspaceKeyLabel();
    default:
      return token.length === 1 ? token.toUpperCase() : token;
  }
}

export function getShortcutLabels(tokens: ShortcutToken[]) {
  return tokens.map(getShortcutTokenLabel);
}
