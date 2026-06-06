import { useMemo, useState } from 'react';
import { FileDiff } from '@pierre/diffs/react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

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
  const [hiddenFilePaths, setHiddenFilePaths] = useState<Set<string>>(
    () => new Set()
  );
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

  function toggleFileHidden(filePath: string) {
    setHiddenFilePaths((current) => {
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
    <div className="grid min-w-0 auto-rows-max content-start gap-0">
      {files.map((file) => {
        const fileComments = commentsByFile.get(file.path) ?? [];
        const isFileHidden = hiddenFilePaths.has(file.path);

        return (
          <section
            key={file.path}
            id={fileElementId(file.path)}
            tabIndex={-1}
            className="attempt-review-diff-file min-w-0 border-b bg-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <StickyFileHeader
              file={file}
              hidden={isFileHidden}
              onToggleHidden={() => toggleFileHidden(file.path)}
            />
            {isFileHidden ? null : (
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
                  enableLineSelection: mode === 'editable',
                  onGutterUtilityClick:
                    mode === 'editable'
                      ? (range) => {
                          addLineComment({
                            comments,
                            filePath: file.path,
                            range,
                            onCommentsChange,
                          });
                        }
                      : undefined,
                }}
                lineAnnotations={fileComments.map((comment) => ({
                  side: comment.endSide ?? comment.side,
                  lineNumber: comment.endLineNumber ?? comment.lineNumber,
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
                      onDelete={() => {
                        onCommentsChange?.(
                          comments.filter((item) => item.id !== comment.id)
                        );
                      }}
                    />
                  );
                }}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

function StickyFileHeader({
  file,
  hidden,
  onToggleHidden,
}: {
  file: AttemptReviewChangedFile;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  return (
    <div className="attempt-review-sticky-file-header sticky z-20 flex min-w-0 items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 text-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex min-w-0 items-center gap-2 font-medium text-card-foreground">
        <button
          type="button"
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={
            hidden ? 'Показать изменение файла' : 'Скрыть изменение файла'
          }
          title={hidden ? 'Показать изменение файла' : 'Скрыть изменение файла'}
          aria-expanded={!hidden}
          onClick={onToggleHidden}
        >
          {hidden ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
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
  range,
  onCommentsChange,
}: {
  comments: AttemptReviewLineComment[];
  filePath: string;
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
    createDraftLineComment({ filePath, range }),
  ]);
}

function createDraftLineComment({
  filePath,
  range,
}: {
  filePath: string;
  range: {
    start: number;
    side?: AttemptReviewCommentSide;
    end: number;
    endSide?: AttemptReviewCommentSide;
  };
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
    authorName: 'Текущий преподаватель',
    updatedAt: new Date().toISOString(),
  };
}

function formatCommentRange(comment: AttemptReviewLineComment): string {
  const startLabel = sideLabel(comment.side);
  const endSide = comment.endSide ?? comment.side;
  const endLineNumber = comment.endLineNumber ?? comment.lineNumber;

  if (comment.side === endSide && comment.lineNumber === endLineNumber) {
    return `${startLabel} #${comment.lineNumber}`;
  }

  if (comment.side === endSide) {
    const from = Math.min(comment.lineNumber, endLineNumber);
    const to = Math.max(comment.lineNumber, endLineNumber);
    return `${pluralSideLabel(comment.side)} #${from}–${to}`;
  }

  return `${startLabel} #${comment.lineNumber} → ${sideLabel(endSide)} #${endLineNumber}`;
}

function sideLabel(side: AttemptReviewCommentSide): string {
  return side === 'additions' ? 'Новая строка' : 'Старая строка';
}

function pluralSideLabel(side: AttemptReviewCommentSide): string {
  return side === 'additions' ? 'Новые строки' : 'Старые строки';
}

function LineCommentCard({
  comment,
  mode,
  onChange,
  onDelete,
}: {
  comment: AttemptReviewLineComment;
  mode: AttemptReviewMode;
  onChange: (html: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="m-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {comment.authorName}
        </span>
        <div className="flex items-center gap-2">
          <span>{formatCommentRange(comment)}</span>
          {mode === 'editable' ? (
            <button
              type="button"
              className="cursor-pointer grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Удалить комментарий"
              title="Удалить комментарий"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
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
