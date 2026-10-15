import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { cn } from '@/shadcn/lib/utils';
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
// PROTOTYPE (#181): `?taskApply=contract` publishes Tasks with the page.
import { usePrototypePageEdit } from '@/features/course/prototype/task-and-deadline-settings/page-edit-slot';

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
}: {
  courseId: CourseId;
  courseSlug: CourseSlug;
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
  const prototypeSlot = usePrototypePageEdit();

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

    // PROTOTYPE (#181): an unfinished new Task stops the publication.
    if (prototypeSlot && !prototypeSlot.beforeApply(workingCopy.content)) {
      return;
    }

    const submittedWorkingCopy = structuredClone(workingCopy);

    await saveMutation.mutateAsync({
      courseId,
      previousSlug: courseSlug,
      slug: submittedWorkingCopy.courseId,
      title: submittedWorkingCopy.title,
      shortTitle: submittedWorkingCopy.shortTitle,
      description: submittedWorkingCopy.description,
      color: submittedWorkingCopy.color,
      iconName: submittedWorkingCopy.iconName,
      content: submittedWorkingCopy.content,
      resources: submittedWorkingCopy.resources,
    });
    // PROTOTYPE (#181): Tasks are created and deleted in the same publication.
    await prototypeSlot?.afterApply(submittedWorkingCopy.content);

    markWorkingCopySaved(submittedWorkingCopy);

    await router.invalidate();

    if (submittedWorkingCopy.courseId !== courseSlug) {
      await navigate({
        to: '/courses/$courseSlug/edit',
        params: { courseSlug: submittedWorkingCopy.courseId },
        replace: true,
      });
    }

    toast.success('Изменения применены');
  }, [
    canApply,
    courseId,
    courseSlug,
    errors,
    isDirty,
    markWorkingCopySaved,
    navigate,
    prototypeSlot,
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

        {prototypeSlot?.render()}

        <CoursePageEditApplyBar
          isDirty={isDirty}
          canApply={canApply}
          isSaving={saveMutation.isPending}
          oldSlug={courseSlug}
          newSlug={workingCopy.courseId}
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
  course,
}: {
  courseId: CourseId;
  courseSlug: CourseSlug;
  course: CoursePage;
}) {
  const [editStore] = useState(() => createCoursePageEditStore({ course }));

  return (
    <CoursePageEditStoreProvider store={editStore}>
      <CoursePageEditContent courseId={courseId} courseSlug={courseSlug} />
    </CoursePageEditStoreProvider>
  );
}

export function CoursePageEditPage({
  courseId,
  courseSlug,
}: {
  courseId: CourseId;
  courseSlug: CourseSlug;
}) {
  const { data: course, isPending } = useCoursePageQuery(courseId);

  if (isPending) {
    return <CoursePageLoading />;
  }

  if (!course) {
    return null;
  }

  return (
    <CoursePageEditLoaded
      key={courseSlug}
      courseId={courseId}
      courseSlug={courseSlug}
      // A Page cached by CourseId may predate a slug change; the working copy
      // starts from the slug the route has just confirmed.
      course={{ ...course, courseId: courseSlug }}
    />
  );
}
