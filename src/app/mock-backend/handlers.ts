import { authHandlers } from '@/features/auth/api/mock';
import { courseHandlers } from '@/features/course/api/mock';
import { courseContextHandlers } from '@/features/course/features/access/api/mock';

export const handlers = [
  ...authHandlers,
  ...courseHandlers,
  ...courseContextHandlers,
];
