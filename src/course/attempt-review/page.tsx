import { useCallback, useMemo, useRef, useState } from 'react';
import type { CodeViewHandle } from '@pierre/diffs/react';
import { useQuery } from '@tanstack/react-query';

import { SESSION_OPTIONS } from '@/auth/api/queries';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { AttemptReviewLineCommentAnnotation } from './model/comment-annotation';
import { prepareLineCommentsForSave } from './model/comment-save';
import { AttemptReviewDiff } from './ui/diff';
import {
  getStoredDiffViewMode,
  saveDiffViewMode,
} from './model/diff-view-mode-storage';
import { useAttemptReviewDraft } from './model/draft';
import { useAttemptReviewFileScroll } from './hooks/use-file-scroll';
import { AttemptReviewFileTree } from './ui/file-tree';
import { AttemptReviewHeader } from './ui/header';
import { useAttemptReviewStickyOffset } from './hooks/use-sticky-offset';
import { AttemptReviewMobileDrawer } from './ui/mobile-drawer';
import { AttemptReviewReviewPanel } from './ui/review-panel';
import {
  useAttemptReviewQuery,
  useCreateAttemptReviewCommentReplyMutation,
  useDeleteAttemptReviewCommentReplyMutation,
  useSaveAttemptReviewMutation,
  useUpdateAttemptReviewCommentReplyMutation,
} from './api/queries';
import { useAttemptReviewWorkerPoolReady } from './hooks/use-worker-pool';
import type {
  AttemptReviewAggregate,
  AttemptReviewDiffViewMode,
  AttemptReviewLineCommentReply,
  AttemptReviewMode,
} from './model/types';

type AttemptReviewPageProps = {
  mode: AttemptReviewMode;
  courseSlug: string;
  taskId: string;
  studentUsername: string;
  attemptId: number;
};

type AttemptReviewPageLoadedProps = {
  review: AttemptReviewAggregate;
} & AttemptReviewPageProps;

export function AttemptReviewPage(props: AttemptReviewPageProps) {
  const reviewQuery = useAttemptReviewQuery(props);
  const isWorkerPoolReady = useAttemptReviewWorkerPoolReady();

  if (reviewQuery.isLoading || !isWorkerPoolReady) {
    return (
      <main className="mx-auto grid min-h-[60vh] w-full max-w-7xl place-items-center p-6">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Spinner /> Загружаем страницу проверки…
        </div>
      </main>
    );
  }

  if (reviewQuery.isError || !reviewQuery.data) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <section className="rounded-2xl border bg-card p-6">
          <h1 className="text-xl font-semibold">Не удалось открыть попытку</h1>
          <p className="mt-2 text-muted-foreground">
            Проверьте параметры маршрута или попробуйте обновить страницу.
          </p>
        </section>
      </main>
    );
  }

  return (
    <AttemptReviewPageLoaded
      key={`${props.courseSlug}:${props.taskId}:${props.studentUsername}:${props.attemptId}`}
      {...props}
      review={reviewQuery.data}
    />
  );
}

function AttemptReviewPageLoaded({
  mode,
  courseSlug,
  taskId,
  studentUsername,
  attemptId,
  review,
}: AttemptReviewPageLoadedProps) {
  const params = { courseSlug, taskId, studentUsername, attemptId };
  const saveMutation = useSaveAttemptReviewMutation();
  const createReplyMutation = useCreateAttemptReviewCommentReplyMutation();
  const updateReplyMutation = useUpdateAttemptReviewCommentReplyMutation();
  const deleteReplyMutation = useDeleteAttemptReviewCommentReplyMutation();
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

  async function submitCommentReply(
    commentId: string,
    html: string
  ): Promise<AttemptReviewLineCommentReply> {
    return createReplyMutation.mutateAsync({ ...params, commentId, html });
  }

  async function updateCommentReply(
    commentId: string,
    replyId: string,
    html: string
  ): Promise<AttemptReviewLineCommentReply> {
    return updateReplyMutation.mutateAsync({
      ...params,
      commentId,
      replyId,
      html,
    });
  }

  async function deleteCommentReply(commentId: string, replyId: string) {
    await deleteReplyMutation.mutateAsync({ ...params, commentId, replyId });
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
          onReplySubmit={submitCommentReply}
          onReplyUpdate={updateCommentReply}
          onReplyDelete={deleteCommentReply}
        />
      </div>
    </main>
  );
}

function scrollToReview() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
