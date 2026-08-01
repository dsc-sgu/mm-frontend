import { useCallback, type RefObject } from 'react';
import type { CodeViewHandle } from '@pierre/diffs/react';

import type { AttemptReviewLineCommentAnnotation } from '@/features/course/features/attempt-review/model/comment-annotation';

type AttemptReviewFileScrollOptions = {
  diffViewerRef: RefObject<CodeViewHandle<AttemptReviewLineCommentAnnotation> | null>;
  isDesktopReviewLayout: boolean;
  onCloseMobileFileTree: () => void;
};

export function useAttemptReviewFileScroll({
  diffViewerRef,
  isDesktopReviewLayout,
  onCloseMobileFileTree,
}: AttemptReviewFileScrollOptions) {
  const scrollToFile = useCallback(
    (path: string) => {
      const scrollCodeView = () => {
        diffViewerRef.current?.scrollTo({
          type: 'item',
          id: path,
          align: 'start',
          behavior: 'smooth',
        });
      };

      if (isDesktopReviewLayout) {
        scrollCodeView();
        return;
      }

      onCloseMobileFileTree();
      window.requestAnimationFrame(scrollCodeView);
    },
    [diffViewerRef, isDesktopReviewLayout, onCloseMobileFileTree]
  );

  return { scrollToFile };
}
