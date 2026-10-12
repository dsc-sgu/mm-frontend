import type { UserId, Username } from '@/features/auth/model/identity';
import type {
  AttemptId,
  AttemptNumber,
  CourseId,
  CourseSlug,
} from './identity';

type Assignable<Target, Value extends Target> = Value;

// ACC-03: compile-time checks only; included by tsconfig.app.json, not Vitest.
export type IdentityTypeChecks = [
  Assignable<UserId, UserId>,
  // @ts-expect-error Username is not a UserId.
  Assignable<UserId, Username>,
  // @ts-expect-error CourseId is not a UserId.
  Assignable<UserId, CourseId>,
  // @ts-expect-error CourseSlug is not a UserId.
  Assignable<UserId, CourseSlug>,
  // @ts-expect-error AttemptId is not a UserId.
  Assignable<UserId, AttemptId>,
  // @ts-expect-error AttemptNumber is not a UserId.
  Assignable<UserId, AttemptNumber>,
  // @ts-expect-error A raw string is not a validated UserId.
  Assignable<UserId, string>,
  // @ts-expect-error A raw number is not a UserId.
  Assignable<UserId, number>,

  Assignable<Username, Username>,
  // @ts-expect-error UserId is not a Username.
  Assignable<Username, UserId>,
  // @ts-expect-error CourseId is not a Username.
  Assignable<Username, CourseId>,
  // @ts-expect-error CourseSlug is not a Username.
  Assignable<Username, CourseSlug>,
  // @ts-expect-error AttemptId is not a Username.
  Assignable<Username, AttemptId>,
  // @ts-expect-error AttemptNumber is not a Username.
  Assignable<Username, AttemptNumber>,
  // @ts-expect-error A raw string is not a validated Username.
  Assignable<Username, string>,
  // @ts-expect-error A raw number is not a Username.
  Assignable<Username, number>,

  Assignable<CourseId, CourseId>,
  // @ts-expect-error UserId is not a CourseId.
  Assignable<CourseId, UserId>,
  // @ts-expect-error Username is not a CourseId.
  Assignable<CourseId, Username>,
  // @ts-expect-error CourseSlug is not a CourseId.
  Assignable<CourseId, CourseSlug>,
  // @ts-expect-error AttemptId is not a CourseId.
  Assignable<CourseId, AttemptId>,
  // @ts-expect-error AttemptNumber is not a CourseId.
  Assignable<CourseId, AttemptNumber>,
  // @ts-expect-error A raw string is not a validated CourseId.
  Assignable<CourseId, string>,
  // @ts-expect-error A raw number is not a CourseId.
  Assignable<CourseId, number>,

  Assignable<CourseSlug, CourseSlug>,
  // @ts-expect-error UserId is not a CourseSlug.
  Assignable<CourseSlug, UserId>,
  // @ts-expect-error Username is not a CourseSlug.
  Assignable<CourseSlug, Username>,
  // @ts-expect-error CourseId is not a CourseSlug.
  Assignable<CourseSlug, CourseId>,
  // @ts-expect-error AttemptId is not a CourseSlug.
  Assignable<CourseSlug, AttemptId>,
  // @ts-expect-error AttemptNumber is not a CourseSlug.
  Assignable<CourseSlug, AttemptNumber>,
  // @ts-expect-error A raw string is not a validated CourseSlug.
  Assignable<CourseSlug, string>,
  // @ts-expect-error A raw number is not a CourseSlug.
  Assignable<CourseSlug, number>,

  Assignable<AttemptId, AttemptId>,
  // @ts-expect-error UserId is not an AttemptId.
  Assignable<AttemptId, UserId>,
  // @ts-expect-error Username is not an AttemptId.
  Assignable<AttemptId, Username>,
  // @ts-expect-error CourseId is not an AttemptId.
  Assignable<AttemptId, CourseId>,
  // @ts-expect-error CourseSlug is not an AttemptId.
  Assignable<AttemptId, CourseSlug>,
  // @ts-expect-error AttemptNumber is not an AttemptId.
  Assignable<AttemptId, AttemptNumber>,
  // @ts-expect-error A raw string is not a validated AttemptId.
  Assignable<AttemptId, string>,
  // @ts-expect-error A raw number is not an AttemptId.
  Assignable<AttemptId, number>,

  Assignable<AttemptNumber, AttemptNumber>,
  // @ts-expect-error UserId is not an AttemptNumber.
  Assignable<AttemptNumber, UserId>,
  // @ts-expect-error Username is not an AttemptNumber.
  Assignable<AttemptNumber, Username>,
  // @ts-expect-error CourseId is not an AttemptNumber.
  Assignable<AttemptNumber, CourseId>,
  // @ts-expect-error CourseSlug is not an AttemptNumber.
  Assignable<AttemptNumber, CourseSlug>,
  // @ts-expect-error AttemptId is not an AttemptNumber.
  Assignable<AttemptNumber, AttemptId>,
  // @ts-expect-error A raw string is not an AttemptNumber.
  Assignable<AttemptNumber, string>,
  // @ts-expect-error A raw number is not a validated AttemptNumber.
  Assignable<AttemptNumber, number>,
];
