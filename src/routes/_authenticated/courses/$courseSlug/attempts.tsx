import { CourseAttemptsPage } from '@/course/attempts/course-attempts.page';
import {
  filtersFromCourseAttemptsSearch,
  searchFromCourseAttemptsFilters,
  validateCourseAttemptsSearch,
} from '@/course/attempts/course-attempts.filters';
import { requireCourseRole } from '@/course/course.guards';
import { createCourseSectionBreadcrumb } from '@/course/course-route.header';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import type { CourseAttemptsFilters } from '@/course/attempts/course-attempts.types';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/attempts'
)({
  staticData: {
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Попытки',
        '/courses/$courseSlug/attempts'
      ),
    },
  },
  validateSearch: validateCourseAttemptsSearch,
  async beforeLoad({ context, params }) {
    await requireCourseRole({
      queryClient: context.queryClient,
      courseSlug: params.courseSlug,
      roles: ['teacher'],
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug } = Route.useParams();
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
      courseSlug={courseSlug}
      appliedFilters={appliedFilters}
      onApplyFilters={handleApplyFilters}
    />
  );
}
