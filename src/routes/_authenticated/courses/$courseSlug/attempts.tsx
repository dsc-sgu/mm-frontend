import { CourseAttemptsPage } from '@/course/attempts/course-attempts.component';
import {
  filtersFromCourseAttemptsSearch,
  searchFromCourseAttemptsFilters,
  validateCourseAttemptsSearch,
} from '@/course/attempts/course-attempts.filters';
import { requireCourseRole } from '@/course/course.guards';
import { createCourseSectionBreadcrumb } from '@/course/course-route.header';
import { createFileRoute } from '@tanstack/react-router';

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

  return (
    <CourseAttemptsPage
      courseSlug={courseSlug}
      appliedFilters={filtersFromCourseAttemptsSearch(search)}
      onApplyFilters={(filters) => {
        void navigate({ search: searchFromCourseAttemptsFilters(filters) });
      }}
    />
  );
}
