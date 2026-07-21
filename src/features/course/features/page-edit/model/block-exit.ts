import { KEYS, type SlateEditor } from 'platejs';

import { focusOrInsertParagraphBelow } from '@/features/course/features/page-edit/model/block-operations';
import { isModShortcut } from '@/features/course/features/page-edit/model/shortcuts';

type BlockExitKeyboardEvent = Pick<
  KeyboardEvent,
  'altKey' | 'ctrlKey' | 'isComposing' | 'key' | 'metaKey' | 'shiftKey'
>;

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
  event: BlockExitKeyboardEvent
) {
  if (
    event.isComposing ||
    !isModShortcut(event, 'Enter') ||
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
