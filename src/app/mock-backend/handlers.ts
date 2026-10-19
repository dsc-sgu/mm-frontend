import { authHandlers } from '@/features/auth/api/mock';
import { courseHandlers } from '@/features/course/api/mock';
import { courseContextHandlers } from '@/features/course/features/access/api/mock';
import { repositoryHandlers } from '@/features/course/features/repository/api/mock';
import { attemptReviewHandlers } from '@/features/course/features/attempt-review/api/mock';
import { reviewHandlers } from '@/features/course/features/review/api/mock';

export const handlers = [
  ...authHandlers,
  ...courseHandlers,
  ...courseContextHandlers,
  ...repositoryHandlers,
  ...attemptReviewHandlers,
  ...reviewHandlers,
];
