import { authHandlers } from '@/features/auth/api/mock';
import { courseHandlers } from '@/features/course/api/mock';

export const handlers = [...authHandlers, ...courseHandlers];
