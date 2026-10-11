import { CourseAttemptsPage } from '@/features/course/features/attempts/page';
import {
  filtersFromCourseAttemptsSearch,
  searchFromCourseAttemptsFilters,
  validateCourseAttemptsSearch,
} from '@/features/course/features/attempts/model/filters';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import type {
  CourseAttemptsFilters,
  CourseAttemptsRouteSearch,
} from '@/features/course/features/attempts/model/types';

// PROTOTYPE (#121): the router parses `?variant=2` as a number and quotes a
// numeric-looking string when it writes one back, so keep numbers as numbers.
type PrototypeSearch = CourseAttemptsRouteSearch & {
  variant?: string | number;
};

function toSearchVariant(variant: string): string | number {
  return /^\d+$/.test(variant) ? Number(variant) : variant;
}

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
  // PROTOTYPE (#121): `variant` selects a filter bar prototype variant.
  validateSearch: (search: Record<string, unknown>): PrototypeSearch => ({
    ...validateCourseAttemptsSearch(search),
    ...(typeof search.variant === 'string' || typeof search.variant === 'number'
      ? { variant: search.variant }
      : {}),
  }),
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
      void navigate({
        search: (previous: PrototypeSearch) => ({
          ...searchFromCourseAttemptsFilters(filters),
          ...(previous.variant != null ? { variant: previous.variant } : {}),
        }),
      });
    },
    [navigate]
  );
  const handlePrototypeVariantChange = useCallback(
    (variant: string) => {
      void navigate({
        search: (previous: PrototypeSearch) => ({
          ...previous,
          variant: toSearchVariant(variant),
        }),
        replace: true,
      });
    },
    [navigate]
  );

  return (
    <CourseAttemptsPage
      courseId={course.id}
      courseSlug={courseSlug}
      appliedFilters={appliedFilters}
      onApplyFilters={handleApplyFilters}
      prototypeVariant={
        search.variant == null ? undefined : String(search.variant)
      }
      onPrototypeVariantChange={handlePrototypeVariantChange}
    />
  );
}
