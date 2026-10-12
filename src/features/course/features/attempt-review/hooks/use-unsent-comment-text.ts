import { createContext, useContext } from 'react';

import type { UnsentCommentTextStore } from '@/features/course/features/attempt-review/model/unsent-comment-text';

export const UnsentCommentTextContext =
  createContext<UnsentCommentTextStore | null>(null);

export function useUnsentCommentText(): UnsentCommentTextStore {
  const store = useContext(UnsentCommentTextContext);

  if (!store) {
    throw new Error(
      'useUnsentCommentText must be used inside UnsentCommentTextContext'
    );
  }

  return store;
}
