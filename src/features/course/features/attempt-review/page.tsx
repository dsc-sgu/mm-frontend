import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { sessionOptions } from '@/features/auth/api/queries';
import type { CourseRole } from '@/features/course/features/access/model/types';
import type { UserId } from '@/features/auth/model/identity';
import { canReplyToAttempt } from './model/permissions';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { AttemptReviewCodeViewHandle } from './model/code-view-annotation';
import { prepareLineCommentsForSave } from './model/comment-save';
import { AttemptReviewDiff } from './ui/diff';
import {
  getStoredDiffViewMode,
  saveDiffViewMode,
} from './model/diff-view-mode-storage';
import { useAttemptReviewDraft } from './model/draft';
import { useAttemptReviewFileScroll } from './hooks/use-file-scroll';
import { UnsentCommentTextContext } from './hooks/use-unsent-comment-text';
import { createUnsentCommentTextStore } from './model/unsent-comment-text';
import { AttemptReviewFileTree } from './ui/file-tree';
import { AttemptReviewHeader } from './ui/header';
import { AttemptReviewMobileDrawer } from './ui/mobile-drawer';
import { AttemptReviewReviewPanel } from './ui/review-panel';
import { AttemptReviewReviewPanelToggle } from './ui/review-panel-toggle';
import {
  attemptMaterialOptions,
  attemptSummaryOptions,
  studentAttemptsOptions,
} from './api/queries';
import { reviewOptions } from '@/features/course/features/review/api/queries';
import {
  useReplyMutations,
  useSaveReviewMutation,
} from '@/features/course/features/review/api/mutations';
import {
  publishedReview,
  type ReviewResult,
} from '@/features/course/features/review/model/types';
import { useAttemptReviewWorkerPoolReady } from './hooks/use-worker-pool';
import type {
  AttemptMaterial,
  AttemptReviewDiffViewMode,
  AttemptReviewLineCommentReply,
  AttemptReviewMode,
  AttemptReviewIdentity,
  AttemptSummary,
  StudentAttempt,
} from './model/types';

type AttemptReviewPageProps = {
  mode: AttemptReviewMode;
  courseRole: CourseRole;
  viewerId: UserId;
} & AttemptReviewIdentity;

type AttemptReviewPageLoadedProps = {
  summary: AttemptSummary;
  review: ReviewResult;
  material: AttemptMaterial;
  attempts: StudentAttempt[];
} & AttemptReviewPageProps;

type AttemptReviewMobileDrawerState = 'none' | 'file-tree' | 'review-panel';

const REVIEW_PANEL_ID = 'attempt-review-review-panel';

/**
 * Shows only the projections of this Attempt: until all of them are loaded,
 * nothing of the previously open Attempt appears under its heading.
 */
export function AttemptReviewPage(props: AttemptReviewPageProps) {
  const { viewerId, courseId, taskId, studentId, attemptId } = props;
  const summaryQuery = useQuery(
    attemptSummaryOptions(viewerId, courseId, attemptId)
  );
  const reviewQuery = useQuery(reviewOptions(viewerId, courseId, attemptId));
  const materialQuery = useQuery(
    attemptMaterialOptions(viewerId, courseId, attemptId)
  );
  const attemptsQuery = useQuery(
    studentAttemptsOptions(viewerId, courseId, taskId, studentId)
  );
  const isWorkerPoolReady = useAttemptReviewWorkerPoolReady();
  const queries = [summaryQuery, reviewQuery, materialQuery, attemptsQuery];

  // A failed background refetch keeps the loaded data and the unsaved edits.
  if (queries.some((query) => query.isError && query.data === undefined)) {
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

  if (
    !summaryQuery.data ||
    !reviewQuery.data ||
    !materialQuery.data ||
    !attemptsQuery.data ||
    !isWorkerPoolReady
  ) {
    return (
      <main
        className={cn(
          'mx-auto grid min-h-[60vh] w-full max-w-7xl place-items-center p-6'
        )}
      >
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Spinner /> Загружаем страницу проверки…
        </div>
      </main>
    );
  }

  return (
    <AttemptReviewPageLoaded
      key={`${viewerId}:${attemptId}`}
      {...props}
      summary={summaryQuery.data}
      review={reviewQuery.data}
      material={materialQuery.data}
      attempts={attemptsQuery.data}
    />
  );
}

function AttemptReviewPageLoaded({
  mode,
  courseRole,
  viewerId,
  courseId,
  taskId,
  studentId,
  attemptId,
  summary,
  review,
  material,
  attempts,
}: AttemptReviewPageLoadedProps) {
  const reviewedAttempt = { viewerId, courseId, taskId, studentId, attemptId };
  const attemptNumber = summary.attemptNumber;
  const saveMutation = useSaveReviewMutation(reviewedAttempt);
  const replyMutations = useReplyMutations(reviewedAttempt);
  const { data: sessionData } = useQuery(sessionOptions);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(
    material.changedFiles[0]?.path ?? null
  );
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);
  const [isReviewPanelCollapsed, setIsReviewPanelCollapsed] = useState(false);
  const [mobileDrawer, setMobileDrawer] =
    useState<AttemptReviewMobileDrawerState>('none');
  const [diffViewMode, setDiffViewMode] = useState<AttemptReviewDiffViewMode>(
    getStoredDiffViewMode
  );
  const [unsentCommentText] = useState(createUnsentCommentTextStore);
  const diffViewerRef = useRef<AttemptReviewCodeViewHandle | null>(null);
  const isDesktopReviewLayout = useMediaQuery('(min-width: 1024px)');
  const currentReviewer = useMemo(() => {
    if (sessionData?.status !== 'authorized') {
      return undefined;
    }

    const { userId, firstName, lastName, patronymic } = sessionData.session;

    return {
      id: userId,
      name: [firstName, lastName, patronymic].filter(Boolean).join(' '),
    };
  }, [sessionData]);
  const {
    draft,
    savedDraft,
    hasChanges,
    gradeError,
    gradeChanged,
    savableGrade,
    setGrade,
    setOverallFeedbackHtml,
    setLineComments,
    discard,
    resetToReview,
  } = useAttemptReviewDraft(review, summary.task.maxGrade);
  const handleDiffViewerChange = useCallback(
    (viewer: AttemptReviewCodeViewHandle | null) => {
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

  const { scrollToFile } = useAttemptReviewFileScroll({
    diffViewerRef,
    isDesktopReviewLayout,
    onCloseMobileFileTree: () => setMobileDrawer('none'),
  });
  const handleSelectFile = useCallback(
    (path: string) => {
      setActiveFilePath(path);
      scrollToFile(path);
    },
    [scrollToFile]
  );

  const canReplyToComments =
    sessionData?.status === 'authorized' &&
    canReplyToAttempt(courseRole, sessionData.session.userId, studentId);
  const canSave =
    mode === 'editable' && savableGrade !== null && !saveMutation.isPending;
  const totalAdded = material.changedFiles.reduce(
    (sum, file) => sum + file.addedLines,
    0
  );
  const totalDeleted = material.changedFiles.reduce(
    (sum, file) => sum + file.deletedLines,
    0
  );
  const published = publishedReview(review);
  const currentAttempt: StudentAttempt = attempts.find(
    ({ id }) => id === attemptId
  ) ?? {
    id: attemptId,
    attemptNumber,
    submittedAt: summary.submittedAt,
    review: published && {
      revision: published.revision,
      grade: published.grade,
    },
    addedLines: totalAdded,
    deletedLines: totalDeleted,
    commentCount: savedDraft.lineComments.length,
  };

  async function submitCommentReply(
    commentId: string,
    html: string
  ): Promise<AttemptReviewLineCommentReply> {
    return replyMutations.create.mutateAsync({ commentId, html });
  }

  async function updateCommentReply(
    commentId: string,
    replyId: string,
    html: string
  ): Promise<AttemptReviewLineCommentReply> {
    return replyMutations.update.mutateAsync({ commentId, replyId, html });
  }

  async function deleteCommentReply(commentId: string, replyId: string) {
    await replyMutations.delete.mutateAsync({ commentId, replyId });
  }

  async function saveReview() {
    if (savableGrade === null) {
      return;
    }

    const savedReview = await saveMutation.mutateAsync({
      grade: savableGrade,
      overallFeedbackHtml: draft.overallFeedbackHtml,
      comments: prepareLineCommentsForSave(draft.lineComments),
    });
    resetToReview(savedReview);
  }

  return (
    <main
      className={cn(
        'flex h-[calc(100dvh-6.25rem-2px)] min-h-0 w-full flex-col gap-0',
        'overflow-hidden px-3 pt-0 pb-0 sm:px-6 sm:pt-0 sm:pb-0 lg:px-8'
      )}
    >
      <AttemptReviewHeader
        mode={mode}
        summary={summary}
        material={material}
        attempts={attempts}
        currentAttempt={currentAttempt}
        diffViewMode={diffViewMode}
        hasChanges={hasChanges}
        totalAdded={totalAdded}
        totalDeleted={totalDeleted}
        onDiffViewModeChange={handleDiffViewModeChange}
        onOpenFileTree={() => setMobileDrawer('file-tree')}
        onOpenReviewPanel={() => setMobileDrawer('review-panel')}
      />

      {mobileDrawer === 'file-tree' && !isDesktopReviewLayout ? (
        <AttemptReviewMobileDrawer
          titleId="attempt-review-mobile-file-tree-title"
          title="Изменённые файлы"
          description="Выберите файл, чтобы перейти к его diff."
          onClose={() => setMobileDrawer('none')}
        >
          <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
            <AttemptReviewFileTree
              key={`mobile-file-tree-${attemptNumber}`}
              files={material.changedFiles}
              comments={draft.lineComments}
              activeFilePath={activeFilePath}
              className="h-full min-h-0 border-0"
              showHeader={false}
              onSelectFile={handleSelectFile}
            />
          </div>
        </AttemptReviewMobileDrawer>
      ) : null}

      {mobileDrawer === 'review-panel' && !isDesktopReviewLayout ? (
        <AttemptReviewMobileDrawer
          titleId="attempt-review-mobile-review-title"
          title="Отзыв по попытке"
          description="Оценка, общий отзыв и сохранение изменений."
          onClose={() => setMobileDrawer('none')}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <AttemptReviewReviewPanel
              review={review}
              maxGrade={summary.task.maxGrade}
              draft={draft}
              mode={mode}
              gradeError={gradeError}
              gradeChanged={gradeChanged}
              hasChanges={hasChanges}
              canSave={canSave}
              savePending={saveMutation.isPending}
              className="mx-0 border-0 sm:mx-0 lg:mx-0"
              onGradeChange={setGrade}
              onFeedbackChange={setOverallFeedbackHtml}
              onDiscard={discard}
              onSave={saveReview}
            />
          </div>
        </AttemptReviewMobileDrawer>
      ) : null}

      <div
        className={cn(
          '-mx-3 grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-0 overflow-hidden',
          'transition-[grid-template-columns] duration-200 sm:-mx-6 lg:-mx-8',
          isFileTreeCollapsed
            ? 'lg:grid-cols-[3rem_minmax(0,1fr)]'
            : 'lg:grid-cols-[20rem_minmax(0,1fr)]'
        )}
      >
        <aside className="hidden min-h-0 lg:block lg:h-full">
          <AttemptReviewFileTree
            files={material.changedFiles}
            comments={draft.lineComments}
            activeFilePath={activeFilePath}
            collapsed={isFileTreeCollapsed}
            className="lg:h-full"
            onToggleCollapsed={() => setIsFileTreeCollapsed((value) => !value)}
            onSelectFile={handleSelectFile}
          />
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
          <UnsentCommentTextContext value={unsentCommentText}>
            <AttemptReviewDiff
              files={material.changedFiles}
              comments={draft.lineComments}
              savedComments={savedDraft.lineComments}
              mode={mode}
              currentReviewer={currentReviewer}
              canReplyToComments={canReplyToComments}
              viewMode={diffViewMode}
              onViewerChange={handleDiffViewerChange}
              className="min-h-0 min-w-0 flex-1 bg-card"
              onCommentsChange={(lineComments) => {
                if (mode === 'editable' || canReplyToComments) {
                  setLineComments(lineComments);
                }
              }}
              onReplySubmit={submitCommentReply}
              onReplyUpdate={updateCommentReply}
              onReplyDelete={deleteCommentReply}
            />
          </UnsentCommentTextContext>

          {isDesktopReviewLayout ? (
            <div
              className={cn(
                'relative shrink-0',
                isReviewPanelCollapsed && 'h-0'
              )}
            >
              <AttemptReviewReviewPanelToggle
                expanded={!isReviewPanelCollapsed}
                controls={REVIEW_PANEL_ID}
                className={cn(
                  'absolute left-1/2 z-20 -translate-x-1/2',
                  isReviewPanelCollapsed ? '-top-10' : 'top-0 -translate-y-1/2'
                )}
                onToggle={() =>
                  setIsReviewPanelCollapsed((collapsed) => !collapsed)
                }
              />
              <AttemptReviewReviewPanel
                id={REVIEW_PANEL_ID}
                review={review}
                maxGrade={summary.task.maxGrade}
                draft={draft}
                mode={mode}
                gradeError={gradeError}
                gradeChanged={gradeChanged}
                hasChanges={hasChanges}
                canSave={canSave}
                savePending={saveMutation.isPending}
                className={cn(
                  'h-[clamp(14rem,35dvh,18rem)] min-h-0',
                  'border-r-0 border-b-0 border-l-0',
                  isReviewPanelCollapsed && 'hidden'
                )}
                onGradeChange={setGrade}
                onFeedbackChange={setOverallFeedbackHtml}
                onDiscard={discard}
                onSave={saveReview}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
