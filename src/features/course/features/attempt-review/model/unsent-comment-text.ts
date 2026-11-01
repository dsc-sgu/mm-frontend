import { areReviewTextsEqual } from '@/features/course/features/review/model/text-document';
import type { ReviewTextDocument } from '@/features/course/features/review/model/text-document';

// Text typed into a comment or reply editor and not sent yet. CodeView
// unmounts a comment card when its file leaves the rendered window or
// switches between the source and rendered views, so the card keeps its
// unsent text here and restores it when it mounts again.
type UnsentText = {
  // The saved text the editor started from; a stale entry is ignored.
  sourceText: ReviewTextDocument | null;
  text: ReviewTextDocument | null;
};

export type UnsentCommentTextStore = {
  read: (
    key: string,
    sourceText: ReviewTextDocument | null
  ) => ReviewTextDocument | null | undefined;
  write: (key: string, text: UnsentText) => void;
  clear: (key: string) => void;
};

export const unsentCommentTextKeys = {
  comment: (commentId: string) => `comment:${commentId}`,
  reply: (commentId: string) => `reply:${commentId}`,
  replyEdit: (replyId: string) => `reply-edit:${replyId}`,
};

export function createUnsentCommentTextStore(): UnsentCommentTextStore {
  const texts = new Map<string, UnsentText>();

  return {
    read: (key, sourceText) => {
      const text = texts.get(key);

      return text && areReviewTextsEqual(text.sourceText, sourceText)
        ? text.text
        : undefined;
    },
    write: (key, text) => {
      texts.set(key, text);
    },
    clear: (key) => {
      texts.delete(key);
    },
  };
}
