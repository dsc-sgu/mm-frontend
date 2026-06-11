import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import type { CodeViewOptions } from '@pierre/diffs';
import { CodeView, type CodeViewHandle } from '@pierre/diffs/react';
import { ArrowUp } from 'lucide-react';

import { AttemptReviewCodeViewHeader } from './attempt-review-code-view-header.component';
import {
  createAttemptReviewCodeViewItems,
  groupAttemptReviewCommentsByFile,
} from './attempt-review-code-view-item.model';
import type { AttemptReviewLineCommentAnnotation } from './attempt-review-comment-annotation.model';
import {
  addLineComment,
  cancelLineComment,
  deleteLineComment,
  deleteLineCommentReply,
  editLineComment,
  revertPendingLineComment,
  submitLineComment,
  submitLineCommentReply,
  updateLineCommentReply,
} from './attempt-review-line-comment.model';
import {
  canManageLineComment,
  canReplyToLineComment,
} from './attempt-review-line-comment-permissions.model';
import { useAttemptReviewScrollHandoff } from './attempt-review-scroll-handoff.hook';
import { useHtmlThemeType } from './attempt-review-theme';
import { AttemptReviewLineCommentCard } from './attempt-review-line-comment-card.component';
import type {
  AttemptReviewChangedFile,
  AttemptReviewCommentAuthor,
  AttemptReviewLineComment,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewDiffProps {
  files: AttemptReviewChangedFile[];
  comments: AttemptReviewLineComment[];
  savedComments?: AttemptReviewLineComment[];
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
  savedComments = [],
  mode,
  currentReviewer,
  canReplyToComments = false,
  loading = false,
  viewMode = 'unified',
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
    () => groupAttemptReviewCommentsByFile(comments),
    [comments]
  );
  const filesByPath = useMemo(
    () => new Map(files.map((file) => [file.path, file])),
    [files]
  );
  const savedCommentsById = useMemo(
    () => new Map(savedComments.map((comment) => [comment.id, comment])),
    [savedComments]
  );

  useAttemptReviewScrollHandoff({
    enabled: enableScrollHandoff,
    rootRef: scrollHandoffRootRef ?? codeViewContainerRef,
    innerScrollRef: codeViewContainerRef,
  });

  const items = useMemo(
    () =>
      createAttemptReviewCodeViewItems({
        files,
        commentsByFile,
        collapsedFilePaths,
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

              onCommentsChange?.(
                addLineComment({
                  comments,
                  filePath: context.item.id,
                  range,
                  currentReviewer,
                })
              );
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

  function applyComments(nextComments: AttemptReviewLineComment[]) {
    onCommentsChange?.(nextComments);
    return nextComments;
  }

  function submitComment(commentId: string, html: string) {
    applyComments(submitLineComment(comments, commentId, html));
    clearSelectedLines();
  }

  function cancelComment(commentId: string) {
    applyComments(cancelLineComment(comments, commentId));
    clearSelectedLines();
  }

  function editComment(commentId: string) {
    applyComments(editLineComment(comments, commentId));
  }

  function deleteComment(commentId: string) {
    applyComments(deleteLineComment(comments, commentId));
  }

  function revertPendingComment(commentId: string) {
    applyComments(
      revertPendingLineComment(comments, commentId, savedCommentsById)
    );
  }

  async function submitReply(commentId: string, html: string) {
    if (!currentReviewer) {
      return;
    }

    const nextComments = applyComments(
      submitLineCommentReply({
        comments,
        commentId,
        html,
        currentReviewer,
      })
    );

    await onCommentsPersist?.(nextComments);
  }

  async function updateReply(commentId: string, replyId: string, html: string) {
    const nextComments = applyComments(
      updateLineCommentReply({ comments, commentId, replyId, html })
    );

    await onCommentsPersist?.(nextComments);
  }

  async function deleteReply(commentId: string, replyId: string) {
    const nextComments = applyComments(
      deleteLineCommentReply({ comments, commentId, replyId })
    );

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
            <AttemptReviewCodeViewHeader
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
              canDelete={mode === 'editable' && canManageLineComment(comment)}
              canEdit={
                mode === 'editable' &&
                canManageLineComment(comment) &&
                currentReviewer?.username === comment.authorUsername
              }
              canReply={
                canReplyToComments &&
                currentReviewer !== undefined &&
                canReplyToLineComment(comment)
              }
              currentUsername={
                canReplyToLineComment(comment)
                  ? currentReviewer?.username
                  : undefined
              }
              onSubmit={(html) => submitComment(comment.id, html)}
              onCancel={() => cancelComment(comment.id)}
              onEdit={() => editComment(comment.id)}
              onDelete={() => deleteComment(comment.id)}
              onRevertPending={() => revertPendingComment(comment.id)}
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
