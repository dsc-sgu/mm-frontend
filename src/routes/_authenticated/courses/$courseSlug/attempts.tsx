import { prefetchAttemptsPage } from '@/features/course/features/attempts/api/prefetch';
import { CourseAttemptsPage } from '@/features/course/features/attempts/page';
import {
  filtersFromCourseAttemptsSearch,
  searchFromCourseAttemptsFilters,
  validateCourseAttemptsSearch,
} from '@/features/course/features/attempts/model/filters';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import type { CourseAttemptsFilters } from '@/features/course/features/attempts/model/types';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/attempts'
)({
  staticData: {
    courseSection: 'attempts',
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Попытки',
        '/courses/$courseSlug/attempts'
      ),
    },
  },
  validateSearch: validateCourseAttemptsSearch,
  loaderDeps: ({ search }) => filtersFromCourseAttemptsSearch(search),
  loader: ({ context, deps }) => {
    prefetchAttemptsPage(context.queryClient, {
      courseId: context.course.id,
      filters: deps,
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { course, courseSlug } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const appliedFilters = useMemo(
    () => filtersFromCourseAttemptsSearch(search),
    [search]
  );
  const handleApplyFilters = useCallback(
    (filters: CourseAttemptsFilters) => {
      void navigate({ search: searchFromCourseAttemptsFilters(filters) });
    },
    [navigate]
  );

  return (
    <CourseAttemptsPage
      courseId={course.id}
      courseSlug={courseSlug}
      appliedFilters={appliedFilters}
      onApplyFilters={handleApplyFilters}
    />
  );
}
