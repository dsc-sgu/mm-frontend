import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { cn } from '@/shadcn/lib/utils';
import type { UserId } from '@/features/auth/model/identity';
import type { CourseRole } from '@/features/course/features/access/model/types';
import { editDocument } from '@/features/course/features/page-document/model/document';
import {
  useCoursePageQuery,
  useSaveCoursePageMutation,
} from '@/features/course/features/page/api/queries';
import { CoursePageLoading } from '@/features/course/features/page/ui/page';
import { createCoursePageEditStore } from '@/features/course/features/page-edit/model/editor-store';
import {
  CoursePageEditStoreProvider,
  useCoursePageEditStore,
} from '@/features/course/features/page-edit/hooks/use-editor-store';
import { matchesShortcut } from '@/features/keyboard/shortcut';
import { saveShortcut } from '@/features/course/features/page-edit/model/shortcuts';
import { CoursePageEditApplyBar } from '@/features/course/features/page-edit/ui/apply-bar';
import { CoursePageContentEditor } from '@/features/course/features/page-edit/ui/content-editor';
import { CoursePageEditHeroEditor } from '@/features/course/features/page-edit/ui/hero-editor';
import type { CoursePage } from '@/features/course/features/page/model/types';
import type { CourseId, CourseSlug } from '@/features/course/model/identity';

import styles from './page.module.css';

const FIELD_BY_ERROR = {
  title: 'course-edit-title',
  shortTitle: 'course-edit-short-title',
  courseId: 'course-edit-slug',
  description: 'course-edit-description',
} as const;

function focusFirstInvalidField(errors: Record<string, string | undefined>) {
  const firstErrorKey = Object.keys(FIELD_BY_ERROR).find((key) => errors[key]);

  if (!firstErrorKey) {
    return;
  }

  const fieldId = FIELD_BY_ERROR[firstErrorKey as keyof typeof FIELD_BY_ERROR];
  document.getElementById(fieldId)?.focus();
}

function CoursePageEditContent({
  courseId,
  courseSlug,
  viewerId,
  role,
}: {
  courseId: CourseId;
  courseSlug: CourseSlug;
  viewerId: UserId;
  role: CourseRole;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const saveMutation = useSaveCoursePageMutation();
  const canApply = useCoursePageEditStore((state) => state.canApply);
  const errors = useCoursePageEditStore((state) => state.errors);
  const isDirty = useCoursePageEditStore((state) => state.isDirty);
  const markWorkingCopySaved = useCoursePageEditStore(
    (state) => state.markWorkingCopySaved
  );
  const resetWorkingCopy = useCoursePageEditStore(
    (state) => state.resetWorkingCopy
  );
  const setWorkingCopy = useCoursePageEditStore(
    (state) => state.setWorkingCopy
  );
  const workingCopy = useCoursePageEditStore((state) => state.workingCopy);

  const apply = useCallback(async () => {
    if (!isDirty) {
      toast.info('Нет изменений');
      return;
    }

    if (!canApply) {
      focusFirstInvalidField(errors);
      toast.error('Исправьте ошибки перед применением.');
      return;
    }

    if (saveMutation.isPending) {
      return;
    }

    const submittedWorkingCopy = structuredClone(workingCopy);

    await saveMutation.mutateAsync({
      courseId,
      viewerId,
      role,
      previousSlug: courseSlug,
      slug: submittedWorkingCopy.slug,
      title: submittedWorkingCopy.title,
      shortTitle: submittedWorkingCopy.shortTitle,
      description: submittedWorkingCopy.description,
      color: submittedWorkingCopy.color,
      iconName: submittedWorkingCopy.iconName,
      content: submittedWorkingCopy.content,
      resources: submittedWorkingCopy.resources,
    });

    markWorkingCopySaved(submittedWorkingCopy);

    await router.invalidate();

    if (submittedWorkingCopy.slug !== courseSlug) {
      await navigate({
        to: '/courses/$courseSlug/edit',
        params: { courseSlug: submittedWorkingCopy.slug },
        replace: true,
      });
    }

    toast.success('Изменения применены');
  }, [
    canApply,
    courseId,
    courseSlug,
    viewerId,
    role,
    errors,
    isDirty,
    markWorkingCopySaved,
    navigate,
    router,
    saveMutation,
    workingCopy,
  ]);

  const applySaveShortcut = useEffectEvent(() => {
    void apply();
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!matchesShortcut(event, saveShortcut)) {
        return;
      }

      event.preventDefault();
      applySaveShortcut();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <main
      id="course-edit-selection-surface"
      className={cn('relative w-full pb-32 sm:py-6', styles.selectionSurface)}
    >
      <div
        aria-hidden="true"
        data-plate-selectable="true"
        data-course-page-selection-start-area="true"
        className="absolute inset-0 z-0"
      />

      <div
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-6xl flex-col',
          'sm:px-6 lg:px-8'
        )}
      >
        <CoursePageEditHeroEditor
          course={workingCopy}
          errors={errors}
          onChange={setWorkingCopy}
        />

        <article
          className={cn(
            'px-5 pt-2 pb-8 md:mt-8 md:rounded-3xl md:border md:border-border',
            'md:-mx-12 md:bg-card md:px-20 lg:-mx-10'
          )}
        >
          <CoursePageContentEditor />
        </article>

        <CoursePageEditApplyBar
          isDirty={isDirty}
          canApply={canApply}
          isSaving={saveMutation.isPending}
          oldSlug={courseSlug}
          newSlug={workingCopy.slug}
          onReset={resetWorkingCopy}
          onApply={apply}
        />
      </div>
    </main>
  );
}

function CoursePageEditLoaded({
  courseId,
  courseSlug,
  viewerId,
  role,
  course,
}: {
  courseId: CourseId;
  courseSlug: CourseSlug;
  viewerId: UserId;
  role: CourseRole;
  course: CoursePage;
}) {
  const [editStore] = useState(() => createCoursePageEditStore({ course }));

  return (
    <CoursePageEditStoreProvider store={editStore}>
      <CoursePageEditContent
        courseId={courseId}
        courseSlug={courseSlug}
        viewerId={viewerId}
        role={role}
      />
    </CoursePageEditStoreProvider>
  );
}

export function CoursePageEditPage({
  courseId,
  courseSlug,
  viewerId,
  role,
}: {
  courseId: CourseId;
  courseSlug: CourseSlug;
  viewerId: UserId;
  role: CourseRole;
}) {
  const { data: outcome, isPending } = useCoursePageQuery({
    courseId,
    viewerId,
    role,
  });

  if (isPending) {
    return <CoursePageLoading />;
  }
  if (outcome?.status !== 'found') {
    return null;
  }
  const document = editDocument(outcome.page.content);
  if (document.status !== 'supported') {
    return null;
  }

  return (
    <CoursePageEditLoaded
      key={courseSlug}
      courseId={courseId}
      courseSlug={courseSlug}
      viewerId={viewerId}
      role={role}
      course={{ ...outcome.page, content: document.blocks }}
    />
  );
}
