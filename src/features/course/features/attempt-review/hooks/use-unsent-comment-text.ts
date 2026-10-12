import { createContext, useContext } from 'react';

import type { UnsentCommentTextStore } from '@/features/course/features/attempt-review/model/unsent-comment-text';

// Without a provider a card still works; its unsent text just lives as long
// as the card itself.
const NO_UNSENT_COMMENT_TEXT: UnsentCommentTextStore = {
  read: () => undefined,
  write: () => {},
  clear: () => {},
};

export const UnsentCommentTextContext = createContext<UnsentCommentTextStore>(
  NO_UNSENT_COMMENT_TEXT
);

export function useUnsentCommentText(): UnsentCommentTextStore {
  return useContext(UnsentCommentTextContext);
}
