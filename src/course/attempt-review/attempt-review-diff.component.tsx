import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import type { CodeViewItem, CodeViewOptions } from '@pierre/diffs';
import { CodeView, type CodeViewHandle } from '@pierre/diffs/react';
import { ArrowUp, ChevronDown, ChevronRight } from 'lucide-react';

import {
  getAttemptReviewFileStatusGlyph,
  getAttemptReviewFileStatusIconClassName,
} from './attempt-review-file-status.format';
import { useAttemptReviewScrollHandoff } from './attempt-review-scroll-handoff.hook';
import { useHtmlThemeType } from './attempt-review-theme';
import { AttemptReviewLineCommentCard } from './attempt-review-line-comment-card.component';
import type {
  AttemptReviewChangedFile,
  AttemptReviewCommentAuthor,
  AttemptReviewCommentSide,
  AttemptReviewLineComment,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewDiffProps {
  files: AttemptReviewChangedFile[];
  comments: AttemptReviewLineComment[];
  mode: AttemptReviewMode;
  currentReviewer?: AttemptReviewCommentAuthor;
  canReplyToComments?: boolean;
  loading?: boolean;
  viewMode?: 'unified' | 'split';
  className?: string;
  enableScrollHandoff?: boolean;
  scrollHandoffRootRef?: RefObject<HTMLElement | null>;
  onScrollToReview?: () => void;
  onCommentsChange?: (comments: AttemptReviewLineComment[]) => void;
  onCommentsPersist?: (
    comments: AttemptReviewLineComment[]
  ) => void | Promise<void>;
  onViewerChange?: (
    viewer: CodeViewHandle<AttemptReviewLineCommentAnnotation> | null
  ) => void;
}

export interface AttemptReviewLineCommentAnnotation {
  comment: AttemptReviewLineComment;
}

const CODE_VIEW_LAYOUT = {
  paddingTop: 0,
  gap: 0,
  paddingBottom: 0,
};

const CODE_VIEW_ITEM_METRICS = {
  diffHeaderHeight: 56,
};

const CODE_VIEW_UNSAFE_CSS = `
  [data-diffs-header='custom'] {
    padding: 0;
    background: var(--card);
    color: var(--card-foreground);
    border: 0;
  }

  [data-diffs-header][data-sticky] {
    z-index: 2;
  }
`;

export function AttemptReviewDiff({
  files,
  comments,
  mode,
  currentReviewer,
  canReplyToComments = false,
  loading = false,
  viewMode = 'split',
  className,
  enableScrollHandoff = false,
  scrollHandoffRootRef,
  onScrollToReview,
  onCommentsChange,
  onCommentsPersist,
  onViewerChange,
}: AttemptReviewDiffProps) {
  const htmlThemeType = useHtmlThemeType();
  const codeViewContainerRef = useRef<HTMLDivElement | null>(null);
  const codeViewHandleRef =
    useRef<CodeViewHandle<AttemptReviewLineCommentAnnotation> | null>(null);
  const [collapsedFilePaths, setCollapsedFilePaths] = useState<Set<string>>(
    () => new Set()
  );
  const commentsByFile = useMemo(
    () => groupCommentsByFile(comments),
    [comments]
  );
  const filesByPath = useMemo(
    () => new Map(files.map((file) => [file.path, file])),
    [files]
  );

  useAttemptReviewScrollHandoff({
    enabled: enableScrollHandoff,
    rootRef: scrollHandoffRootRef ?? codeViewContainerRef,
    innerScrollRef: codeViewContainerRef,
  });

  const items = useMemo<CodeViewItem<AttemptReviewLineCommentAnnotation>[]>(
    () =>
      files.map((file) => {
        const fileComments = commentsByFile.get(file.path) ?? [];
        const collapsed = collapsedFilePaths.has(file.path);

        return {
          id: file.path,
          type: 'diff',
          fileDiff: file.diff,
          collapsed,
          version: buildItemVersion(file.path, collapsed, fileComments),
          annotations: fileComments.map((comment) => ({
            side: comment.endSide ?? comment.side,
            lineNumber: comment.endLineNumber ?? comment.lineNumber,
            metadata: { comment },
          })),
        };
      }),
    [collapsedFilePaths, commentsByFile, files]
  );

  const options = useMemo<CodeViewOptions<AttemptReviewLineCommentAnnotation>>(
    () => ({
      layout: CODE_VIEW_LAYOUT,
      itemMetrics: CODE_VIEW_ITEM_METRICS,
      diffStyle: viewMode,
      themeType: htmlThemeType,
      overflow: 'wrap',
      stickyHeaders: true,
      lineHoverHighlight: 'both',
      enableGutterUtility: mode === 'editable' && currentReviewer !== undefined,
      enableLineSelection: mode === 'editable',
      unsafeCSS: CODE_VIEW_UNSAFE_CSS,
      onGutterUtilityClick:
        mode === 'editable' && currentReviewer
          ? (range, context) => {
              if (context.item.type !== 'diff') {
                return;
              }

              addLineComment({
                comments,
                filePath: context.item.id,
                range,
                currentReviewer,
                onCommentsChange,
              });
            }
          : undefined,
    }),
    [comments, currentReviewer, htmlThemeType, mode, onCommentsChange, viewMode]
  );

  const handleViewerChange = useCallback(
    (viewer: CodeViewHandle<AttemptReviewLineCommentAnnotation> | null) => {
      codeViewHandleRef.current = viewer;
      onViewerChange?.(viewer);
    },
    [onViewerChange]
  );

  if (loading) {
    return (
      <section className="rounded-2xl border bg-card p-6 text-muted-foreground">
        Загружаем дифф попытки…
      </section>
    );
  }

  if (files.length === 0) {
    return (
      <section className="rounded-2xl border bg-card p-6 text-muted-foreground">
        В этой попытке нет изменений относительно базовой версии.
      </section>
    );
  }

  function clearSelectedLines() {
    codeViewHandleRef.current?.clearSelectedLines();
  }

  function updateComment(
    commentId: string,
    update: (
      comment: AttemptReviewLineComment
    ) => AttemptReviewLineComment | null
  ): AttemptReviewLineComment[] {
    const nextComments = comments.flatMap((comment) => {
      if (comment.id !== commentId) {
        return [comment];
      }

      const nextComment = update(comment);
      return nextComment ? [nextComment] : [];
    });

    onCommentsChange?.(nextComments);
    return nextComments;
  }

  function submitComment(commentId: string, html: string) {
    updateComment(commentId, (comment) => ({
      ...comment,
      html,
      status: 'saved',
      isEditing: false,
      updatedAt: new Date().toISOString(),
    }));
    clearSelectedLines();
  }

  function cancelComment(commentId: string) {
    updateComment(commentId, (comment) => {
      if (comment.status === 'draft') {
        return null;
      }

      return { ...comment, isEditing: false };
    });
    clearSelectedLines();
  }

  function editComment(commentId: string) {
    updateComment(commentId, (comment) => ({ ...comment, isEditing: true }));
  }

  function deleteComment(commentId: string) {
    updateComment(commentId, () => null);
  }

  async function submitReply(commentId: string, html: string) {
    if (!currentReviewer) {
      return;
    }

    const now = new Date().toISOString();
    const nextComments = updateComment(commentId, (comment) => ({
      ...comment,
      replies: [
        ...(comment.replies ?? []),
        {
          id: `reply-${comment.id}-${Date.now()}`,
          html,
          authorName: currentReviewer.name,
          authorUsername: currentReviewer.username,
          updatedAt: now,
        },
      ],
      updatedAt: now,
    }));

    await onCommentsPersist?.(nextComments);
  }

  async function updateReply(commentId: string, replyId: string, html: string) {
    const now = new Date().toISOString();
    const nextComments = updateComment(commentId, (comment) => ({
      ...comment,
      replies: (comment.replies ?? []).map((reply) =>
        reply.id === replyId ? { ...reply, html, updatedAt: now } : reply
      ),
      updatedAt: now,
    }));

    await onCommentsPersist?.(nextComments);
  }

  async function deleteReply(commentId: string, replyId: string) {
    const now = new Date().toISOString();
    const nextComments = updateComment(commentId, (comment) => ({
      ...comment,
      replies: (comment.replies ?? []).filter((reply) => reply.id !== replyId),
      updatedAt: now,
    }));

    await onCommentsPersist?.(nextComments);
  }

  function toggleFileCollapsed(filePath: string) {
    setCollapsedFilePaths((current) => {
      const next = new Set(current);

      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }

      return next;
    });
  }

  return (
    <div className={['relative', className].filter(Boolean).join(' ')}>
      <CodeView<AttemptReviewLineCommentAnnotation>
        ref={handleViewerChange}
        containerRef={codeViewContainerRef}
        items={items}
        className="attempt-review-code-view h-full min-h-0 min-w-0 overflow-y-auto overflow-x-clip overscroll-contain bg-card [overflow-anchor:none] [will-change:scroll-position] [&_diffs-container]:overflow-clip"
        options={options}
        renderCustomHeader={(item) => {
          if (item.type !== 'diff') {
            return null;
          }

          const file = filesByPath.get(item.id);

          if (!file) {
            return null;
          }

          return (
            <CodeViewFileHeader
              file={file}
              collapsed={item.collapsed === true}
              onToggleCollapsed={() => toggleFileCollapsed(item.id)}
            />
          );
        }}
        renderAnnotation={(annotation) => {
          const comment = annotation.metadata.comment;

          return (
            <AttemptReviewLineCommentCard
              key={`${comment.id}:${comment.status ?? 'saved'}:${comment.isEditing === true ? 'editing' : 'readonly'}:${comment.html}`}
              comment={comment}
              mode={mode}
              canDelete={mode === 'editable'}
              canEdit={
                mode === 'editable' &&
                currentReviewer?.username === comment.authorUsername
              }
              canReply={
                canReplyToComments &&
                currentReviewer !== undefined &&
                comment.status !== 'draft'
              }
              currentUsername={currentReviewer?.username}
              onSubmit={(html) => submitComment(comment.id, html)}
              onCancel={() => cancelComment(comment.id)}
              onEdit={() => editComment(comment.id)}
              onDelete={() => deleteComment(comment.id)}
              onReplySubmit={(html) => submitReply(comment.id, html)}
              onReplyUpdate={(replyId, html) =>
                updateReply(comment.id, replyId, html)
              }
              onReplyDelete={(replyId) => deleteReply(comment.id, replyId)}
            />
          );
        }}
      />
      {enableScrollHandoff && onScrollToReview ? (
        <button
          type="button"
          className="absolute right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full border bg-background/95 px-3 py-2 text-sm font-medium shadow-lg backdrop-blur transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onScrollToReview}
        >
          <ArrowUp className="size-4" /> <span>К отзыву</span>
        </button>
      ) : null}
    </div>
  );
}

function CodeViewFileHeader({
  file,
  collapsed,
  onToggleCollapsed,
}: {
  file: AttemptReviewChangedFile;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <div className="flex h-14 min-w-0 items-center justify-between gap-3 border-b bg-card/95 px-4 text-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex min-w-0 items-center gap-2 font-medium text-card-foreground">
        <button
          type="button"
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={
            collapsed ? 'Показать изменение файла' : 'Скрыть изменение файла'
          }
          title={
            collapsed ? 'Показать изменение файла' : 'Скрыть изменение файла'
          }
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-md border text-xs leading-none ${getAttemptReviewFileStatusIconClassName(file.status)}`}
          aria-hidden="true"
        >
          <span className="-translate-y-px leading-none">
            {getAttemptReviewFileStatusGlyph(file.status)}
          </span>
        </span>
        <span className="min-w-0 truncate">{file.path}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
        {file.deletedLines > 0 || file.addedLines === 0 ? (
          <span className="text-rose-500">−{file.deletedLines}</span>
        ) : null}
        {file.addedLines > 0 || file.deletedLines === 0 ? (
          <span className="text-emerald-500">+{file.addedLines}</span>
        ) : null}
      </div>
    </div>
  );
}

function buildItemVersion(
  filePath: string,
  collapsed: boolean,
  comments: AttemptReviewLineComment[]
): number {
  return hashText(
    JSON.stringify({
      filePath,
      collapsed,
      comments: comments.map((comment) => ({
        id: comment.id,
        side: comment.side,
        lineNumber: comment.lineNumber,
        endSide: comment.endSide,
        endLineNumber: comment.endLineNumber,
        html: comment.html,
        authorUsername: comment.authorUsername,
        status: comment.status,
        isEditing: comment.isEditing,
        replies: comment.replies,
      })),
    })
  );
}

function hashText(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return hash;
}

function groupCommentsByFile(comments: AttemptReviewLineComment[]) {
  const grouped = new Map<string, AttemptReviewLineComment[]>();

  comments.forEach((comment) => {
    grouped.set(comment.filePath, [
      ...(grouped.get(comment.filePath) ?? []),
      comment,
    ]);
  });

  return grouped;
}

function addLineComment({
  comments,
  filePath,
  range,
  currentReviewer,
  onCommentsChange,
}: {
  comments: AttemptReviewLineComment[];
  filePath: string;
  currentReviewer: AttemptReviewCommentAuthor;
  range: {
    start: number;
    side?: AttemptReviewCommentSide;
    end: number;
    endSide?: AttemptReviewCommentSide;
  };
  onCommentsChange: AttemptReviewDiffProps['onCommentsChange'];
}) {
  onCommentsChange?.([
    ...comments,
    createDraftLineComment({ filePath, range, currentReviewer }),
  ]);
}

function createDraftLineComment({
  filePath,
  range,
  currentReviewer,
}: {
  filePath: string;
  range: {
    start: number;
    side?: AttemptReviewCommentSide;
    end: number;
    endSide?: AttemptReviewCommentSide;
  };
  currentReviewer: AttemptReviewCommentAuthor;
}): AttemptReviewLineComment {
  const side = range.side ?? range.endSide ?? 'additions';
  const endSide = range.endSide ?? side;
  const lineNumber = range.start;
  const endLineNumber = range.end;

  return {
    id: `draft-${filePath}-${side}-${lineNumber}-${endSide}-${endLineNumber}-${Date.now()}`,
    filePath,
    side,
    lineNumber,
    endSide:
      endSide === side && endLineNumber === lineNumber ? undefined : endSide,
    endLineNumber: endLineNumber === lineNumber ? undefined : endLineNumber,
    html: '<p></p>',
    authorName: currentReviewer.name,
    authorUsername: currentReviewer.username,
    updatedAt: new Date().toISOString(),
    status: 'draft',
  };
}
