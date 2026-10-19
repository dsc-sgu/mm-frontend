import { useCallback, useMemo, useRef, useState } from 'react';
import { CodeView } from '@pierre/diffs/react';
import { AttemptReviewCodeViewHeader } from './code-view-header';
import {
  RenderedMarkdownDiffView,
  isMarkdownFile,
  type MarkdownFileView,
} from '@/features/course/features/attempt-review/features/rendered-markdown';
import {
  createAttemptReviewCodeViewItems,
  groupAttemptReviewCommentsByFile,
} from '@/features/course/features/attempt-review/model/code-view-item';
import type {
  AttemptReviewCodeViewAnnotation,
  AttemptReviewCodeViewHandle,
  AttemptReviewCodeViewOptions,
} from '@/features/course/features/attempt-review/model/code-view-annotation';
import { getLineCommentStatus } from '@/features/course/features/attempt-review/model/comment-lifecycle';
import {
  addLineComment,
  addLineCommentReply,
  cancelLineComment,
  deleteLineComment,
  deleteLineCommentReply,
  editLineComment,
  revertPendingLineComment,
  submitLineComment,
  updateLineCommentReply,
} from '@/features/course/features/attempt-review/model/line-comment';
import {
  canManageLineComment,
  canReplyToLineComment,
} from '@/features/course/features/attempt-review/model/comment-permissions';
import { useHtmlThemeType } from '@/features/course/features/attempt-review/hooks/use-html-theme';
import { AttemptReviewLineCommentCard } from './comments/line-card';
import type {
  AttemptReviewChangedFile,
  AttemptReviewCommentAuthor,
  AttemptReviewLineComment,
  AttemptReviewLineCommentReply,
  AttemptReviewMode,
} from '@/features/course/features/attempt-review/model/types';
import { cn } from '@/shadcn/lib/utils';

type AttemptReviewDiffProps = {
  files: AttemptReviewChangedFile[];
  comments: AttemptReviewLineComment[];
  savedComments?: AttemptReviewLineComment[];
  mode: AttemptReviewMode;
  currentReviewer?: AttemptReviewCommentAuthor;
  canReplyToComments?: boolean;
  loading?: boolean;
  viewMode?: 'unified' | 'split';
  className?: string;
  onCommentsChange?: (comments: AttemptReviewLineComment[]) => void;
  onReplySubmit?: (
    commentId: string,
    html: string
  ) => Promise<AttemptReviewLineCommentReply>;
  onReplyUpdate?: (
    commentId: string,
    replyId: string,
    html: string
  ) => Promise<AttemptReviewLineCommentReply>;
  onReplyDelete?: (commentId: string, replyId: string) => Promise<void>;
  onViewerChange?: (viewer: AttemptReviewCodeViewHandle | null) => void;
};

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

  /* File items only host the rendered Markdown view: hide their placeholder
     line and gutter, so the view's annotation spans the whole row. */
  pre[data-file] [data-gutter],
  pre[data-file] [data-line] {
    display: none;
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
  onCommentsChange,
  onReplySubmit,
  onReplyUpdate,
  onReplyDelete,
  onViewerChange,
}: AttemptReviewDiffProps) {
  const htmlThemeType = useHtmlThemeType();
  const codeViewContainerRef = useRef<HTMLDivElement | null>(null);
  const codeViewHandleRef = useRef<AttemptReviewCodeViewHandle | null>(null);
  const [collapsedFilePaths, setCollapsedFilePaths] = useState<Set<string>>(
    () => new Set()
  );
  const [renderedFilePaths, setRenderedFilePaths] = useState<Set<string>>(
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

  const items = useMemo(
    () =>
      createAttemptReviewCodeViewItems({
        files,
        commentsByFile,
        collapsedFilePaths,
        renderedFilePaths,
      }),
    [collapsedFilePaths, commentsByFile, files, renderedFilePaths]
  );

  const options = useMemo<AttemptReviewCodeViewOptions>(
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
    (viewer: AttemptReviewCodeViewHandle | null) => {
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
    if (!currentReviewer || !onReplySubmit) {
      return;
    }

    const reply = await onReplySubmit(commentId, html);

    applyComments(addLineCommentReply({ comments, commentId, reply }));
  }

  async function updateReply(commentId: string, replyId: string, html: string) {
    if (!onReplyUpdate) {
      return;
    }

    const reply = await onReplyUpdate(commentId, replyId, html);

    applyComments(updateLineCommentReply({ comments, commentId, reply }));
  }

  async function deleteReply(commentId: string, replyId: string) {
    if (!onReplyDelete) {
      return;
    }

    await onReplyDelete(commentId, replyId);
    applyComments(deleteLineCommentReply({ comments, commentId, replyId }));
  }

  function changeFileView(filePath: string, view: MarkdownFileView) {
    setRenderedFilePaths((current) => {
      const next = new Set(current);

      if (view === 'rendered') {
        next.add(filePath);
      } else {
        next.delete(filePath);
      }

      return next;
    });
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
      <CodeView<AttemptReviewCodeViewAnnotation>
        ref={handleViewerChange}
        containerRef={codeViewContainerRef}
        items={items}
        className={cn(
          'attempt-review-code-view h-full min-h-0 min-w-0 overflow-x-clip',
          'overflow-y-auto overscroll-contain bg-card',
          '[will-change:scroll-position] [overflow-anchor:none]',
          '[&_diffs-container]:overflow-clip'
        )}
        options={options}
        renderCustomHeader={(item) => {
          const file = filesByPath.get(item.id);

          if (!file) {
            return null;
          }

          return (
            <AttemptReviewCodeViewHeader
              file={file}
              collapsed={item.collapsed === true}
              onToggleCollapsed={() => toggleFileCollapsed(item.id)}
              markdownView={
                isMarkdownFile(file.path)
                  ? {
                      value: renderedFilePaths.has(file.path)
                        ? 'rendered'
                        : 'source',
                      onChange: (view) => changeFileView(file.path, view),
                    }
                  : undefined
              }
            />
          );
        }}
        renderAnnotation={(annotation) => {
          if (annotation.metadata.type === 'rendered-markdown') {
            const { file } = annotation.metadata;

            return (
              <RenderedMarkdownDiffView
                oldText={file.contents.oldText}
                newText={file.contents.newText}
                lineCommentCount={commentsByFile.get(file.path)?.length ?? 0}
                onShowSource={() => changeFileView(file.path, 'source')}
              />
            );
          }

          const comment = annotation.metadata.comment;

          return (
            <AttemptReviewLineCommentCard
              key={`${comment.id}:${getLineCommentStatus(comment)}:${comment.isEditing === true ? 'editing' : 'readonly'}:${comment.html}`}
              comment={comment}
              mode={mode}
              canDelete={mode === 'editable' && canManageLineComment(comment)}
              canEdit={
                mode === 'editable' &&
                canManageLineComment(comment) &&
                currentReviewer?.id === comment.author.id
              }
              canReply={
                canReplyToComments &&
                currentReviewer !== undefined &&
                canReplyToLineComment(comment)
              }
              currentUserId={
                canReplyToLineComment(comment) ? currentReviewer?.id : undefined
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
    </div>
  );
}
