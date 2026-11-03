// PROTOTYPE mm-277 (variant G): the Course Page editor before the Course
// exists. A static segment wins over `$courseSlug`, so the slug `new` is
// reserved (`RESERVED_SLUGS`).
import { useEffect } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { useActivePrototypeStore } from '@/app/prototypes/active';
import { PROTOTYPES_ENABLED } from '@/app/prototypes/enabled';
import { CreateCourseEditorPage } from '@/features/course/prototype/create-course/ui/editor-creation';

export const Route = createFileRoute('/_authenticated/courses/new')({
  beforeLoad() {
    if (!PROTOTYPES_ENABLED) {
      throw notFound();
    }
  },
  staticData: {
    header: {
      getBreadcrumb: [
        { label: 'Панель управления', to: '/' },
        { label: 'Новый курс' },
      ],
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const setActive = useActivePrototypeStore((state) => state.setActive);
  useEffect(() => {
    setActive('create-course');
  }, [setActive]);
  return <CreateCourseEditorPage />;
}
