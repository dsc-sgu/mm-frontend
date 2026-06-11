import { useCallback, useMemo, useRef, useState } from 'react';
import type { CodeViewHandle } from '@pierre/diffs/react';
import { useQuery } from '@tanstack/react-query';

import { SESSION_OPTIONS } from '@/auth/auth.queries';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/use-media-query.hook';
import type { AttemptReviewLineCommentAnnotation } from './attempt-review-comment-annotation.model';
import {
  prepareLineCommentsForImmediatePersist,
  prepareLineCommentsForSave,
} from './attempt-review-comment-save.model';
import { AttemptReviewDiff } from './attempt-review-diff.component';
import type { AttemptReviewDiffViewMode } from './attempt-review-diff-view-toggle.component';
import {
  getStoredDiffViewMode,
  saveDiffViewMode,
} from './attempt-review-diff-view-mode.storage';
import { useAttemptReviewDraft } from './attempt-review-draft.hook';
import { useAttemptReviewFileScroll } from './attempt-review-file-scroll.hook';
import { AttemptReviewFileTree } from './attempt-review-file-tree.component';
import { AttemptReviewHeader } from './attempt-review-header.component';
import { useAttemptReviewStickyOffset } from './attempt-review-layout.hook';
import { AttemptReviewMobileDrawer } from './attempt-review-mobile-drawer.component';
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
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<AttemptReviewDiffViewMode>(
    getStoredDiffViewMode
  );
  const pageHeaderRef = useRef<HTMLElement | null>(null);
  const pageRootRef = useRef<HTMLElement | null>(null);
  const diffSectionRef = useRef<HTMLDivElement | null>(null);
  const diffViewerRef =
    useRef<CodeViewHandle<AttemptReviewLineCommentAnnotation> | null>(null);
  const isDesktopReviewLayout = useMediaQuery('(min-width: 1024px)');
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
    hasLineCommentChanges,
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
  const handleDiffViewModeChange = useCallback(
    (value: AttemptReviewDiffViewMode) => {
      setDiffViewMode(value);
      saveDiffViewMode(value);
    },
    []
  );

  useAttemptReviewStickyOffset({
    pageHeaderRef,
    pageRootRef,
    isDesktopReviewLayout,
  });

  const { scrollToFile } = useAttemptReviewFileScroll({
    diffSectionRef,
    diffViewerRef,
    isDesktopReviewLayout,
    onCloseMobileFileTree: () => setIsFileTreeDrawerOpen(false),
  });
  const handleSelectFile = useCallback(
    (path: string) => {
      setActiveFilePath(path);
      scrollToFile(path);
    },
    [scrollToFile]
  );

  const canReplyToComments =
    sessionData?.status === 'AUTHORIZED' &&
    (sessionData.session.role === 'teacher' ||
      sessionData.session.username === studentUsername);
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

  async function persistLineComments(lineComments: AttemptReviewLineComment[]) {
    if (mode === 'editable') {
      await saveMutation.mutateAsync({
        ...params,
        score: review.current.grade?.score ?? null,
        overallFeedbackHtml: review.overallFeedback.html,
        lineComments: prepareLineCommentsForImmediatePersist(
          lineComments,
          review.lineComments
        ),
      });
      return;
    }

    const savedReview = await saveMutation.mutateAsync({
      ...params,
      score: draft.score ? Number(draft.score) : null,
      overallFeedbackHtml: draft.overallFeedbackHtml,
      lineComments: prepareLineCommentsForSave(lineComments),
    });
    resetToReview(savedReview);
  }

  async function saveReview() {
    const savedReview = await saveMutation.mutateAsync({
      ...params,
      score: draft.score ? Number(draft.score) : null,
      overallFeedbackHtml: draft.overallFeedbackHtml,
      lineComments: prepareLineCommentsForSave(draft.lineComments),
    });
    resetToReview(savedReview);
  }

  function scrollToReview() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main
      ref={pageRootRef}
      className="flex w-full flex-col gap-0 px-3 pt-0 pb-0 sm:px-6 sm:pt-0 sm:pb-0 lg:px-8"
    >
      <AttemptReviewHeader
        ref={pageHeaderRef}
        mode={mode}
        review={review}
        diffViewMode={diffViewMode}
        hasChanges={hasChanges}
        totalAdded={totalAdded}
        totalDeleted={totalDeleted}
        onDiffViewModeChange={handleDiffViewModeChange}
        onOpenFileTree={() => {
          setIsReviewPanelOpen(false);
          setIsFileTreeDrawerOpen(true);
        }}
        onOpenReviewPanel={() => {
          setIsFileTreeDrawerOpen(false);
          setIsReviewPanelOpen(true);
        }}
      />

      {isFileTreeDrawerOpen && !isDesktopReviewLayout ? (
        <AttemptReviewMobileDrawer
          titleId="attempt-review-mobile-file-tree-title"
          title="Изменённые файлы"
          description="Выберите файл, чтобы перейти к его diff."
          onClose={() => setIsFileTreeDrawerOpen(false)}
        >
          <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
            <AttemptReviewFileTree
              key={`mobile-file-tree-${attemptId}`}
              files={review.changedFiles}
              comments={draft.lineComments}
              activeFilePath={activeFilePath}
              className="h-full min-h-0 border-0"
              showHeader={false}
              onSelectFile={handleSelectFile}
            />
          </div>
        </AttemptReviewMobileDrawer>
      ) : null}

      {isReviewPanelOpen && !isDesktopReviewLayout ? (
        <AttemptReviewMobileDrawer
          titleId="attempt-review-mobile-review-title"
          title="Отзыв по попытке"
          description="Оценка, общий отзыв и сохранение изменений."
          onClose={() => setIsReviewPanelOpen(false)}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <AttemptReviewReviewPanel
              review={review}
              draft={draft}
              mode={mode}
              scoreError={scoreError}
              hasChanges={hasChanges}
              hasCommentChanges={hasLineCommentChanges}
              canSave={canSave}
              savePending={saveMutation.isPending}
              className="mx-0 border-0 sm:mx-0 lg:mx-0"
              onScoreChange={setScore}
              onFeedbackChange={setOverallFeedbackHtml}
              onDiscard={discard}
              onSave={saveReview}
            />
          </div>
        </AttemptReviewMobileDrawer>
      ) : null}

      {isDesktopReviewLayout ? (
        <AttemptReviewReviewPanel
          review={review}
          draft={draft}
          mode={mode}
          scoreError={scoreError}
          hasChanges={hasChanges}
          hasCommentChanges={hasLineCommentChanges}
          canSave={canSave}
          savePending={saveMutation.isPending}
          onScoreChange={setScore}
          onFeedbackChange={setOverallFeedbackHtml}
          onDiscard={discard}
          onSave={saveReview}
        />
      ) : null}

      <div
        ref={diffSectionRef}
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
            comments={draft.lineComments}
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
          savedComments={review.lineComments}
          mode={mode}
          currentReviewer={currentReviewer}
          canReplyToComments={canReplyToComments}
          viewMode={diffViewMode}
          enableScrollHandoff={isDesktopReviewLayout}
          scrollHandoffRootRef={pageRootRef}
          onScrollToReview={scrollToReview}
          onViewerChange={handleDiffViewerChange}
          className="h-[70vh] min-h-0 min-w-0 bg-card lg:h-full"
          onCommentsChange={(lineComments) => {
            if (mode === 'editable' || canReplyToComments) {
              setLineComments(lineComments);
            }
          }}
          onCommentsPersist={persistLineComments}
        />
      </div>
    </main>
  );
}
