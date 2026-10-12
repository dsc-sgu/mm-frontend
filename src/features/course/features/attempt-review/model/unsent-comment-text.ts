// Text typed into a comment or reply editor and not sent yet. CodeView
// unmounts a comment card when its file leaves the rendered window or
// switches between the source and rendered views, so the card keeps its
// unsent text here and restores it when it mounts again.
type UnsentText = {
  // The saved text the editor started from; a stale entry is ignored.
  sourceHtml: string;
  html: string;
};

export type UnsentCommentTextStore = {
  read: (key: string, sourceHtml: string) => string | undefined;
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
    read: (key, sourceHtml) => {
      const text = texts.get(key);

      return text?.sourceHtml === sourceHtml ? text.html : undefined;
    },
    write: (key, text) => {
      texts.set(key, text);
    },
    clear: (key) => {
      texts.delete(key);
    },
  };
}
