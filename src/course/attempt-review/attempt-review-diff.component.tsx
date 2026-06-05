import { useMemo } from 'react';
import { FileDiff } from '@pierre/diffs/react';
import { MessageSquarePlus } from 'lucide-react';

import { fileElementId } from './attempt-review.dom';
import { useHtmlThemeType } from './attempt-review-theme';
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
  const htmlThemeType = useHtmlThemeType();
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
            className="attempt-review-diff-file min-w-0 scroll-mt-24 border-b bg-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <StickyFileHeader file={file} />
            <FileDiff<LineCommentAnnotation>
              fileDiff={file.diff}
              disableWorkerPool
              className="attempt-review-pierre-diff"
              options={{
                diffStyle: viewMode,
                themeType: htmlThemeType,
                overflow: 'wrap',
                stickyHeader: false,
                disableFileHeader: true,
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

function StickyFileHeader({ file }: { file: AttemptReviewChangedFile }) {
  return (
    <div className="sticky top-17 z-20 flex min-w-0 items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 text-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex min-w-0 items-center gap-2 font-medium text-card-foreground">
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-md border text-xs leading-none ${statusIconClassName(file.status)}`}
          aria-hidden="true"
        >
          <span className="-translate-y-px leading-none">
            {statusGlyph(file.status)}
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

function statusIconClassName(
  status: AttemptReviewChangedFile['status']
): string {
  if (status === 'added') {
    return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500';
  }

  if (status === 'deleted') {
    return 'border-rose-500/50 bg-rose-500/10 text-rose-500';
  }

  return 'border-blue-500/50 bg-blue-500/10 text-blue-500';
}

function statusGlyph(status: AttemptReviewChangedFile['status']): string {
  if (status === 'added') {
    return '+';
  }

  if (status === 'deleted') {
    return '−';
  }

  return '•';
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
