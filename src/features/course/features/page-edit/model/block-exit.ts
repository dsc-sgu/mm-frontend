import { KEYS, type SlateEditor } from 'platejs';

import { focusOrInsertParagraphBelow } from '@/features/course/features/page-edit/model/block-operations';
import {
  matchesShortcut,
  type Shortcut,
  type ShortcutEvent,
} from '@/features/keyboard/shortcut';

const exitShortcut: Shortcut = { mod: true, key: 'Enter' };

function getStructuredBlock(editor: SlateEditor) {
  const codeBlock = editor.api.above({
    match: { type: editor.getType(KEYS.codeBlock) },
  });

  if (codeBlock) {
    return codeBlock;
  }

  return editor.api.above({
    match: { type: editor.getType(KEYS.blockquote) },
  });
}

export function exitCourseStructuredBlock(
  editor: SlateEditor,
  event: ShortcutEvent
) {
  if (
    !matchesShortcut(event, exitShortcut) ||
    !editor.selection ||
    editor.api.isExpanded()
  ) {
    return false;
  }

  const structuredBlock = getStructuredBlock(editor);

  if (!structuredBlock) {
    return false;
  }

  return focusOrInsertParagraphBelow(editor, structuredBlock[1]);
}
