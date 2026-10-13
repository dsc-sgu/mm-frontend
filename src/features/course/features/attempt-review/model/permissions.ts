import type { UserId } from '@/features/auth/model/identity';
import type { CourseRole } from '@/features/course/features/access/model/types';

export function canReplyToAttempt(
  role: CourseRole,
  userId: UserId,
  ownerId: UserId
) {
  return role === 'teacher' || (role === 'student' && userId === ownerId);
}
