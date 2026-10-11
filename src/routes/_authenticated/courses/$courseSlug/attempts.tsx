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

// PROTOTYPE (#121)
type PrototypeSearch = CourseAttemptsRouteSearch & { variant?: string };

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
  // PROTOTYPE (#121): `variant` selects a quick-grading prototype variant.
  validateSearch: (search: Record<string, unknown>): PrototypeSearch => ({
    ...validateCourseAttemptsSearch(search),
    ...(typeof search.variant === 'string' ? { variant: search.variant } : {}),
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
          ...(previous.variant ? { variant: previous.variant } : {}),
        }),
      });
    },
    [navigate]
  );
  const handlePrototypeVariantChange = useCallback(
    (variant: string) => {
      void navigate({
        search: (previous: PrototypeSearch) => ({ ...previous, variant }),
        replace: true,
      });
    },
    [navigate]
  );

  return (
    <CourseAttemptsPage
      courseSlug={courseSlug}
      appliedFilters={appliedFilters}
      onApplyFilters={handleApplyFilters}
      prototypeVariant={search.variant}
      onPrototypeVariantChange={handlePrototypeVariantChange}
    />
  );
}
