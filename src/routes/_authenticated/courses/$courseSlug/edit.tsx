import { CoursePageEditPage } from '@/features/course/features/page-edit/page';
import { requireCourseRole } from '@/features/course/routing/guards';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';
// PROTOTYPE (#181): `?variant=C` shows deadlines inside the editor.
import { PrototypeEditor } from '@/features/course/prototype/task-and-deadline-settings/editor';
import { validatePrototypeSearch } from '@/features/course/prototype/task-and-deadline-settings/search';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/edit'
)({
  validateSearch: validatePrototypeSearch,
  staticData: {
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Редактирование',
        '/courses/$courseSlug/edit'
      ),
    },
  },
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
  const { variant } = Route.useSearch();

  if (variant === 'C') {
    return (
      <PrototypeEditor courseSlug={courseSlug}>
        <CoursePageEditPage courseSlug={courseSlug} />
      </PrototypeEditor>
    );
  }

  return <CoursePageEditPage courseSlug={courseSlug} />;
}
