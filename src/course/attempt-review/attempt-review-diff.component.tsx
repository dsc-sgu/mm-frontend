import { useMemo } from 'react';
import { FileDiff } from '@pierre/diffs/react';
import { MessageSquarePlus } from 'lucide-react';

import { fileElementId } from './attempt-review.dom';
import { RichTextEditor } from './rich-text-editor.component';
import type {
  AttemptReviewChangedFile,
  AttemptReviewCommentSide,
  AttemptReviewLineComment,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewDiffProps {
  files: AttemptReviewChangedFile[];
  comments: AttemptReviewLineComment[];
  mode: AttemptReviewMode;
  loading?: boolean;
  activeFilePath?: string | null;
  viewMode?: 'unified' | 'split';
  onCommentsChange?: (comments: AttemptReviewLineComment[]) => void;
}

interface LineCommentAnnotation {
  comment: AttemptReviewLineComment;
}

export function AttemptReviewDiff({
  files,
  comments,
  mode,
  loading = false,
  viewMode = 'split',
  onCommentsChange,
}: AttemptReviewDiffProps) {
  const commentsByFile = useMemo(
    () => groupCommentsByFile(comments),
    [comments]
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

  return (
    <div className="grid min-w-0 auto-rows-max content-start gap-0">
      {files.map((file) => {
        const fileComments = commentsByFile.get(file.path) ?? [];

        return (
          <section
            key={file.path}
            id={fileElementId(file.path)}
            tabIndex={-1}
            className="attempt-review-diff-file scroll-mt-24 overflow-hidden border-b bg-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FileDiff<LineCommentAnnotation>
              fileDiff={file.diff}
              disableWorkerPool
              className="attempt-review-pierre-diff"
              options={{
                diffStyle: viewMode,
                overflow: 'wrap',
                stickyHeader: false,
                lineHoverHighlight: 'both',
                enableGutterUtility: mode === 'editable',
                onLineClick:
                  mode === 'editable'
                    ? (line) => {
                        addLineComment({
                          comments,
                          filePath: file.path,
                          side: line.annotationSide,
                          lineNumber: line.lineNumber,
                          onCommentsChange,
                        });
                      }
                    : undefined,
              }}
              lineAnnotations={fileComments.map((comment) => ({
                side: comment.side,
                lineNumber: comment.lineNumber,
                metadata: { comment },
              }))}
              renderAnnotation={(annotation) => {
                const comment = annotation.metadata.comment;

                return (
                  <LineCommentCard
                    key={comment.id}
                    comment={comment}
                    mode={mode}
                    onChange={(html) => {
                      onCommentsChange?.(
                        comments.map((item) =>
                          item.id === comment.id ? { ...item, html } : item
                        )
                      );
                    }}
                  />
                );
              }}
              renderGutterUtility={(getHoveredLine) => {
                if (mode !== 'editable') {
                  return null;
                }

                return (
                  <button
                    type="button"
                    className="grid size-6 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Добавить комментарий к ${file.path}`}
                    title="Добавить комментарий"
                    onClick={() => {
                      const hoveredLine = getHoveredLine();

                      if (!hoveredLine) {
                        return;
                      }

                      addLineComment({
                        comments,
                        filePath: file.path,
                        side: hoveredLine.side,
                        lineNumber: hoveredLine.lineNumber,
                        onCommentsChange,
                      });
                    }}
                  >
                    <MessageSquarePlus className="size-3.5" />
                  </button>
                );
              }}
            />
          </section>
        );
      })}
    </div>
  );
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
  side,
  lineNumber,
  onCommentsChange,
}: {
  comments: AttemptReviewLineComment[];
  filePath: string;
  side: AttemptReviewCommentSide;
  lineNumber: number;
  onCommentsChange: AttemptReviewDiffProps['onCommentsChange'];
}) {
  onCommentsChange?.([
    ...comments,
    createDraftLineComment({ filePath, side, lineNumber }),
  ]);
}

function createDraftLineComment({
  filePath,
  side,
  lineNumber,
}: {
  filePath: string;
  side: AttemptReviewCommentSide;
  lineNumber: number;
}): AttemptReviewLineComment {
  return {
    id: `draft-${filePath}-${side}-${lineNumber}-${Date.now()}`,
    filePath,
    side,
    lineNumber,
    html: '<p></p>',
    authorName: 'Текущий преподаватель',
    updatedAt: new Date().toISOString(),
  };
}

function LineCommentCard({
  comment,
  mode,
  onChange,
}: {
  comment: AttemptReviewLineComment;
  mode: AttemptReviewMode;
  onChange: (html: string) => void;
}) {
  return (
    <div className="m-3 rounded-xl border bg-background p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {comment.authorName}
        </span>
        <span>
          {comment.side === 'additions' ? 'Новая строка' : 'Старая строка'} #
          {comment.lineNumber}
        </span>
      </div>
      <RichTextEditor
        value={comment.html}
        editable={mode === 'editable'}
        minHeightClassName="min-h-20"
        placeholder="Комментарий к строке…"
        onChange={onChange}
      />
    </div>
  );
}
