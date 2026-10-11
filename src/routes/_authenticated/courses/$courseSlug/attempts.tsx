import { CourseAttemptsPage } from '@/features/course/features/attempts/page';
import {
  filtersFromCourseAttemptsSearch,
  searchFromCourseAttemptsFilters,
  validateCourseAttemptsSearch,
} from '@/features/course/features/attempts/model/filters';
import { requireCourseRole } from '@/features/course/routing/guards';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import type {
  CourseAttemptsFilters,
  CourseAttemptsRouteSearch,
} from '@/features/course/features/attempts/model/types';

// PROTOTYPE (#121): any `variant` turns on the top-bar prototype. The router
// parses `?variant=2` as a number, so accept both.
type PrototypeSearch = CourseAttemptsRouteSearch & {
  variant?: string | number;
};

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
  validateSearch: (search: Record<string, unknown>): PrototypeSearch => ({
    ...validateCourseAttemptsSearch(search),
    ...(typeof search.variant === 'string' || typeof search.variant === 'number'
      ? { variant: search.variant }
      : {}),
  }),
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
      void navigate({
        search: (previous: PrototypeSearch) => ({
          ...searchFromCourseAttemptsFilters(filters),
          ...(previous.variant != null ? { variant: previous.variant } : {}),
        }),
      });
    },
    [navigate]
  );
  return (
    <CourseAttemptsPage
      courseSlug={courseSlug}
      appliedFilters={appliedFilters}
      onApplyFilters={handleApplyFilters}
      prototypeVariant={
        search.variant == null ? undefined : String(search.variant)
      }
    />
  );
}
