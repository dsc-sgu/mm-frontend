import { useCallback, useMemo, useRef, useState } from 'react';
import type { CodeViewHandle } from '@pierre/diffs/react';
import { useQuery } from '@tanstack/react-query';
import { PanelLeftOpen, X } from 'lucide-react';

import { SESSION_OPTIONS } from '@/auth/auth.queries';
import { Button } from '@/shadcn/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shadcn/components/ui/drawer';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/use-media-query.hook';
import { AttemptReviewAttemptSelect } from './attempt-review-attempt-select.component';
import { formatAttemptReviewDateTime } from './attempt-review-date.format';
import {
  AttemptReviewDiffViewToggle,
  type AttemptReviewDiffViewMode,
} from './attempt-review-diff-view-toggle.component';
import {
  AttemptReviewDiff,
  type AttemptReviewLineCommentAnnotation,
} from './attempt-review-diff.component';
import { useAttemptReviewDraft } from './attempt-review-draft.hook';
import { AttemptReviewFileTree } from './attempt-review-file-tree.component';
import { useAttemptReviewStickyOffset } from './attempt-review-layout.hook';
import { useSaveAttemptReviewMutation } from './attempt-review.queries';
import { AttemptReviewReviewPanel } from './attempt-review-review-panel.component';
import type {
  AttemptReviewAggregate,
  AttemptReviewLineComment,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewPageContentProps {
  mode: AttemptReviewMode;
  courseSlug: string;
  taskId: string;
  studentUsername: string;
  attemptId: number;
  review: AttemptReviewAggregate;
}

export function AttemptReviewPageContent({
  mode,
  courseSlug,
  taskId,
  studentUsername,
  attemptId,
  review,
}: AttemptReviewPageContentProps) {
  const params = { courseSlug, taskId, studentUsername, attemptId };
  const saveMutation = useSaveAttemptReviewMutation();
  const { data: sessionData } = useQuery(SESSION_OPTIONS);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(
    review.changedFiles[0]?.path ?? null
  );
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);
  const [isFileTreeDrawerOpen, setIsFileTreeDrawerOpen] = useState(false);
  const [diffViewMode, setDiffViewMode] =
    useState<AttemptReviewDiffViewMode>('split');
  const pageHeaderRef = useRef<HTMLElement | null>(null);
  const pageRootRef = useRef<HTMLElement | null>(null);
  const diffViewerRef =
    useRef<CodeViewHandle<AttemptReviewLineCommentAnnotation> | null>(null);
  const scrollRequestIdRef = useRef(0);
  const isDesktopReviewLayout = useMediaQuery('(min-width: 1024px)');
  const isSummaryCompact = true;
  const currentReviewer = useMemo(() => {
    if (sessionData?.status !== 'AUTHORIZED') {
      return undefined;
    }

    const { username, firstName, lastName, patronymic } = sessionData.session;

    return {
      username,
      name: [lastName, firstName, patronymic].filter(Boolean).join(' '),
    };
  }, [sessionData]);
  const {
    draft,
    hasChanges,
    scoreError,
    setScore,
    setOverallFeedbackHtml,
    setLineComments,
    discard,
    resetToReview,
  } = useAttemptReviewDraft(review);
  const handleDiffViewerChange = useCallback(
    (viewer: CodeViewHandle<AttemptReviewLineCommentAnnotation> | null) => {
      diffViewerRef.current = viewer;
    },
    []
  );

  useAttemptReviewStickyOffset({
    pageHeaderRef,
    pageRootRef,
    isDesktopReviewLayout,
    isSummaryCompact,
  });

  const canSave =
    mode === 'editable' && hasChanges && !scoreError && !saveMutation.isPending;
  const totalAdded = review.changedFiles.reduce(
    (sum, file) => sum + file.addedLines,
    0
  );
  const totalDeleted = review.changedFiles.reduce(
    (sum, file) => sum + file.deletedLines,
    0
  );

  function scrollCodeViewToFile(path: string, scrollRequestId: number) {
    stagedScrollCodeViewToItem(
      diffViewerRef.current,
      path,
      () => scrollRequestIdRef.current === scrollRequestId
    );
  }

  function scrollToFile(path: string) {
    const scrollRequestId = scrollRequestIdRef.current + 1;
    scrollRequestIdRef.current = scrollRequestId;

    if (!isDesktopReviewLayout || isPageAtBottom()) {
      scrollCodeViewToFile(path, scrollRequestId);
      return;
    }

    window.scrollTo({
      top: getPageMaxScrollTop(),
      behavior: 'smooth',
    });

    waitForPageBottom(
      () => {
        scrollCodeViewToFile(path, scrollRequestId);
      },
      () => scrollRequestIdRef.current === scrollRequestId
    );
  }

  function handleSelectFile(path: string) {
    setActiveFilePath(path);

    if (isDesktopReviewLayout) {
      scrollToFile(path);
      return;
    }

    setIsFileTreeDrawerOpen(false);
    window.requestAnimationFrame(() => scrollToFile(path));
  }

  function scrollToReview() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main
      ref={pageRootRef}
      className="flex w-full flex-col gap-0 px-3 pt-0 pb-0 sm:px-6 sm:pt-0 sm:pb-0 lg:px-8"
    >
      <header
        ref={pageHeaderRef}
        className={cn(
          '-mx-3 sticky top-0 z-30 overflow-hidden border-b bg-background/95 px-3 backdrop-blur transition-all duration-200 supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-4',
          isSummaryCompact ? 'py-2' : 'py-4'
        )}
      >
        <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p
              className={cn(
                'overflow-hidden text-sm font-medium text-muted-foreground transition-all duration-200',
                isSummaryCompact
                  ? 'max-h-0 -translate-y-1 opacity-0'
                  : 'max-h-5 translate-y-0 opacity-100'
              )}
            >
              {mode === 'editable'
                ? 'Проверка преподавателем'
                : 'Просмотр попытки'}
            </p>
            <h1
              className={cn(
                'break-words font-semibold tracking-tight transition-all duration-200',
                isSummaryCompact ? 'text-lg leading-6' : 'text-2xl leading-8'
              )}
            >
              Попытка #{review.current.attemptNumber}:{' '}
              {review.current.task.title}
            </h1>
            <p
              className={cn(
                'flex flex-wrap text-muted-foreground transition-all duration-200',
                isSummaryCompact
                  ? 'mt-0.5 gap-x-2 gap-y-0 text-xs leading-4'
                  : 'mt-1 gap-x-3 gap-y-1 text-sm leading-5'
              )}
            >
              <span>{review.current.student.fullName}</span>
              <span>Максимум: {review.current.task.maxScore}</span>
              <span>
                Отправлено{' '}
                {formatAttemptReviewDateTime(review.current.submittedAt)}
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <span className="text-emerald-700 dark:text-emerald-300">
                  +{totalAdded}
                </span>
                <span className="text-rose-700 dark:text-rose-300">
                  −{totalDeleted}
                </span>
              </span>
              <span>
                {review.baselineAttemptNumber
                  ? `Сравнение с попыткой #${review.baselineAttemptNumber}`
                  : 'Сравнение с пустой базой'}
              </span>
            </p>
          </div>

          <div className="flex w-full min-w-0 gap-2 lg:w-auto lg:items-center lg:shrink-0">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-2.5 min-[480px]:px-3 lg:hidden"
              onClick={() => setIsFileTreeDrawerOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
              <span className="hidden min-[480px]:inline">Файлы</span>
            </Button>
            <AttemptReviewDiffViewToggle
              value={diffViewMode}
              onChange={setDiffViewMode}
            />
            <AttemptReviewAttemptSelect
              review={review}
              mode={mode}
              variant="header"
              className="min-w-0 flex-1 lg:w-[21rem] lg:flex-none lg:shrink-0"
            />
          </div>
        </div>
      </header>

      <Drawer
        direction="left"
        open={isFileTreeDrawerOpen && !isDesktopReviewLayout}
        onOpenChange={setIsFileTreeDrawerOpen}
      >
        <DrawerContent className="!inset-0 !h-dvh !max-h-none !w-screen !max-w-none !rounded-none !border-0">
          <div className="flex h-full min-h-0 flex-col bg-card">
            <DrawerHeader className="flex-row items-start justify-between gap-4 border-b text-left">
              <div className="min-w-0">
                <DrawerTitle>Изменённые файлы</DrawerTitle>
                <DrawerDescription>
                  Выберите файл, чтобы перейти к его diff.
                </DrawerDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Закрыть список файлов"
                onClick={() => setIsFileTreeDrawerOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </DrawerHeader>
            <div className="min-h-0 flex-1">
              <AttemptReviewFileTree
                files={review.changedFiles}
                activeFilePath={activeFilePath}
                className="h-full border-0"
                onSelectFile={handleSelectFile}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AttemptReviewReviewPanel
        review={review}
        draft={draft}
        mode={mode}
        scoreError={scoreError}
        hasChanges={hasChanges}
        canSave={canSave}
        savePending={saveMutation.isPending}
        onScoreChange={setScore}
        onFeedbackChange={setOverallFeedbackHtml}
        onDiscard={discard}
        onSave={async () => {
          const savedReview = await saveMutation.mutateAsync({
            ...params,
            score: draft.score ? Number(draft.score) : null,
            overallFeedbackHtml: draft.overallFeedbackHtml,
            lineComments: prepareLineCommentsForSave(draft.lineComments),
          });
          resetToReview(savedReview);
        }}
      />

      <div
        className={cn(
          '-mx-3 grid min-w-0 items-start gap-0 transition-[grid-template-columns] duration-200 sm:-mx-6 lg:-mx-8 lg:sticky lg:top-[var(--attempt-review-sticky-top,4rem)] lg:h-[calc(100dvh_-_var(--attempt-review-sticky-top,4rem))] lg:overflow-hidden',
          isFileTreeCollapsed
            ? 'lg:grid-cols-[3rem_minmax(0,1fr)]'
            : 'lg:grid-cols-[20rem_minmax(0,1fr)]'
        )}
      >
        <aside className="hidden min-h-0 lg:block lg:h-full lg:self-start">
          <AttemptReviewFileTree
            files={review.changedFiles}
            activeFilePath={activeFilePath}
            collapsed={isFileTreeCollapsed}
            className="lg:h-full"
            onToggleCollapsed={() => setIsFileTreeCollapsed((value) => !value)}
            onSelectFile={handleSelectFile}
          />
        </aside>

        <AttemptReviewDiff
          files={review.changedFiles}
          comments={draft.lineComments}
          mode={mode}
          currentReviewer={currentReviewer}
          viewMode={diffViewMode}
          enableScrollHandoff={isDesktopReviewLayout}
          scrollHandoffRootRef={pageRootRef}
          onScrollToReview={scrollToReview}
          onViewerChange={handleDiffViewerChange}
          className="h-[70vh] min-h-0 min-w-0 bg-card lg:h-full"
          onCommentsChange={(lineComments) => {
            if (mode === 'editable') {
              setLineComments(lineComments);
            }
          }}
        />
      </div>
    </main>
  );
}

function prepareLineCommentsForSave(
  comments: AttemptReviewLineComment[]
): AttemptReviewLineComment[] {
  return comments
    .filter((comment) => comment.status !== 'draft')
    .map((comment) => ({
      id: comment.id,
      filePath: comment.filePath,
      side: comment.side,
      lineNumber: comment.lineNumber,
      endSide: comment.endSide,
      endLineNumber: comment.endLineNumber,
      html: comment.html,
      authorName: comment.authorName,
      authorUsername: comment.authorUsername,
      updatedAt: comment.updatedAt,
      status: 'saved',
    }));
}

const PAGE_BOTTOM_EPSILON = 2;
const PAGE_BOTTOM_WAIT_MAX_FRAMES = 90;
const CODE_VIEW_SMOOTH_SCROLL_VIEWPORTS = 3;
const CODE_VIEW_STAGED_SCROLL_THRESHOLD_VIEWPORTS = 6;
const CODE_VIEW_STAGED_SCROLL_FRAME_DELAY = 2;

function stagedScrollCodeViewToItem(
  viewer: CodeViewHandle<AttemptReviewLineCommentAnnotation> | null,
  itemId: string,
  shouldContinue: () => boolean
) {
  if (!viewer || !shouldContinue()) {
    return;
  }

  const instance = viewer.getInstance();

  if (!instance) {
    smoothScrollCodeViewToItem(viewer, itemId);
    return;
  }

  const targetTop = instance.getTopForItem(itemId);
  const currentTop = instance.getScrollTop();
  const viewportHeight = instance.getHeight();

  if (
    targetTop == null ||
    !Number.isFinite(targetTop) ||
    !Number.isFinite(currentTop) ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0
  ) {
    smoothScrollCodeViewToItem(viewer, itemId);
    return;
  }

  const distance = targetTop - currentTop;
  const smoothDistance = viewportHeight * CODE_VIEW_SMOOTH_SCROLL_VIEWPORTS;
  const stagedScrollThreshold =
    viewportHeight * CODE_VIEW_STAGED_SCROLL_THRESHOLD_VIEWPORTS;

  if (Math.abs(distance) <= stagedScrollThreshold) {
    smoothScrollCodeViewToItem(viewer, itemId);
    return;
  }

  viewer.scrollTo({
    type: 'position',
    position: Math.max(0, targetTop - Math.sign(distance) * smoothDistance),
    behavior: 'instant',
  });

  waitForAnimationFrames(CODE_VIEW_STAGED_SCROLL_FRAME_DELAY, () => {
    if (shouldContinue()) {
      smoothScrollCodeViewToItem(viewer, itemId);
    }
  });
}

function smoothScrollCodeViewToItem(
  viewer: CodeViewHandle<AttemptReviewLineCommentAnnotation>,
  itemId: string
) {
  viewer.scrollTo({
    type: 'item',
    id: itemId,
    align: 'start',
    behavior: 'smooth',
  });
}

function waitForAnimationFrames(frameCount: number, callback: () => void) {
  if (frameCount <= 0) {
    callback();
    return;
  }

  window.requestAnimationFrame(() => {
    waitForAnimationFrames(frameCount - 1, callback);
  });
}

function waitForPageBottom(
  callback: () => void,
  shouldContinue: () => boolean
) {
  let frameCount = 0;

  function tick() {
    if (!shouldContinue()) {
      return;
    }

    if (isPageAtBottom() || frameCount >= PAGE_BOTTOM_WAIT_MAX_FRAMES) {
      callback();
      return;
    }

    frameCount += 1;
    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
}

function isPageAtBottom(): boolean {
  return getPageMaxScrollTop() - window.scrollY <= PAGE_BOTTOM_EPSILON;
}

function getPageMaxScrollTop(): number {
  const pageScroller = document.scrollingElement;

  if (!pageScroller) {
    return 0;
  }

  return Math.max(0, pageScroller.scrollHeight - pageScroller.clientHeight);
}
