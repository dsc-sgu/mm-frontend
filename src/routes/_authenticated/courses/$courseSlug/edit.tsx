import { CoursePageEditPage } from '@/features/course/features/page-edit/page';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';
// PROTOTYPE (#181): with #181 on, deadlines show inside the editor (C).
import { PrototypeEditor } from '@/features/course/prototype/task-and-deadline-settings/editor';
import {
  useCurrentVariant,
  validatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/edit'
)({
  validateSearch: validatePrototypeSearch,
  staticData: {
    courseSection: 'edit',
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Редактирование',
        '/courses/$courseSlug/edit'
      ),
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { course, courseSlug } = Route.useRouteContext();
  const variant = useCurrentVariant();

  if (variant === 'C') {
    return (
      <PrototypeEditor courseSlug={courseSlug}>
        <CoursePageEditPage courseId={course.id} courseSlug={courseSlug} />
      </PrototypeEditor>
    );
  }

  return <CoursePageEditPage courseId={course.id} courseSlug={courseSlug} />;
}
