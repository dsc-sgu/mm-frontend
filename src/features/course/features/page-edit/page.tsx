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
import { isModShortcut } from '@/features/course/features/page-edit/model/shortcuts';
import { CoursePageEditApplyBar } from '@/features/course/features/page-edit/ui/apply-bar';
import { CoursePageContentEditor } from '@/features/course/features/page-edit/ui/content-editor';
import { CoursePageEditHeroEditor } from '@/features/course/features/page-edit/ui/hero-editor';
import type { CoursePage } from '@/features/course/features/page/model/types';

const FIELD_BY_ERROR = {
  title: 'course-edit-title',
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

function CoursePageEditContent({ courseSlug }: { courseSlug: string }) {
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
      courseSlug,
      courseId: submittedWorkingCopy.courseId,
      title: submittedWorkingCopy.title,
      description: submittedWorkingCopy.description,
      color: submittedWorkingCopy.color,
      iconName: submittedWorkingCopy.iconName,
      content: submittedWorkingCopy.content,
      resources: submittedWorkingCopy.resources,
    });

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
    courseSlug,
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
      if (!isModShortcut(event, 's')) {
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
      className={cn(
        'mx-auto flex w-full max-w-6xl flex-col pb-32',
        'sm:px-6 sm:py-6 lg:px-8'
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
        newSlug={workingCopy.courseId}
        onReset={resetWorkingCopy}
        onApply={apply}
      />
    </main>
  );
}

function CoursePageEditLoaded({
  courseSlug,
  course,
}: {
  courseSlug: string;
  course: CoursePage;
}) {
  const [editStore] = useState(() => createCoursePageEditStore({ course }));

  return (
    <CoursePageEditStoreProvider store={editStore}>
      <CoursePageEditContent courseSlug={courseSlug} />
    </CoursePageEditStoreProvider>
  );
}

export function CoursePageEditPage({ courseSlug }: { courseSlug: string }) {
  const { data: course, isPending } = useCoursePageQuery(courseSlug);

  if (isPending) {
    return <CoursePageLoading />;
  }

  if (!course) {
    return null;
  }

  return (
    <CoursePageEditLoaded
      key={courseSlug}
      courseSlug={courseSlug}
      course={course}
    />
  );
}
