// PROTOTYPE mm-277. This module never calls the real creation backend.
import * as v from 'valibot';
import {
  CourseIdSchema,
  CourseSlugSchema,
} from '@/features/course/model/identity';
import type { CreatedCourse } from './creation';

async function loadMock() {
  if (import.meta.env.VITE_MOCK_BACKEND !== 'true') return null;
  return import('@/app/mock-backend/state');
}

export async function checkMockSlug(slug: string) {
  const backend = await loadMock();
  if (!backend) return 'unavailable';
  return backend.mockBackend.state.courses.some(
    (course) => course.slug === slug
  )
    ? 'taken'
    : 'available';
}

export async function registerMockCourse(command: CreatedCourse) {
  const backend = await loadMock();
  if (!backend) return { status: 'unavailable' } as const;
  const { state } = backend.mockBackend;
  const user = state.users.find(({ id }) => id === state.session?.userId);
  if (!user) return { status: 'unavailable' } as const;
  const id = v.parse(CourseIdSchema, command.id);
  const slug = v.parse(CourseSlugSchema, command.slug);
  const previous = state.courses.find((course) => course.id === id);
  if (previous) return { status: 'created', course: command } as const;
  if (state.courses.some((course) => course.slug === slug))
    return { status: 'conflict' } as const;
  const teacher = {
    id: user.id,
    username: user.username,
    ...backend.mockUserName(user),
  };
  const course: (typeof state.courses)[number] = {
    id,
    slug,
    title: command.name,
    shortTitle: '',
    color: 'blue',
    iconName: 'book-open',
    teachers: [teacher],
    accessState: 'draft',
    subgroups: [{ id: crypto.randomUUID(), name: 'Подгруппа 1' }],
    page: {
      courseId: slug,
      title: command.name,
      shortTitle: '',
      description: '',
      color: 'blue',
      iconName: 'book-open',
      teachers: [teacher],
      resources: { images: [], files: [], assignments: [] },
      content: [],
    },
  };
  // All parts are assembled before the synchronous commit to the shared world.
  state.courses.unshift(course);
  state.memberships.push({ courseId: id, userId: user.id, role: 'teacher' });
  return { status: 'created', course: command } as const;
}
