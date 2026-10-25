import * as v from 'valibot';
import { seededCourses } from '@/app/mock-backend/courses';
import type { FullName } from '@/features/auth/model/full-name';
import {
  UserIdSchema,
  UsernameSchema,
  type UserId,
  type Username,
} from '@/features/auth/model/identity';
import type { CourseRole } from '@/features/course/features/access/model/types';
import {
  CourseIdSchema,
  CourseSlugSchema,
  AttemptIdSchema,
  AttemptNumberSchema,
  type AttemptId,
  type AttemptNumber,
  type CourseId,
} from '@/features/course/model/identity';
import type { CourseSummary, Teacher } from '@/features/course/model/types';
import { GradeSchema, type Grade } from '@/features/course/model/grade';
import {
  ReviewRevisionSchema,
  type ReviewRevision,
} from '@/features/course/features/review/model/revision';
import type { ReviewCommentSide } from '@/features/course/features/review/model/types';
import { devReview } from '@/app/mock-backend/reviews';

// Stateful backend shared by the feature MSW handlers. Each reset clones a
// deterministic world, keeping exported fixtures independent of mutations.
export type MockUser = {
  id: UserId;
  username: Username;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  avatarURL: string;
};

export type MockSession = {
  userId: UserId;
  expiresAt: string;
};

export type MockCourse = CourseSummary & {
  accessState: 'draft' | 'open';
};

export type MockCourseMembership = {
  courseId: CourseId;
  userId: UserId;
  role: CourseRole;
};

export type MockTask = {
  courseId: CourseId;
  id: string;
  title: string;
  maxGrade: Grade;
  deadlineAt: string;
};

export type MockAttempt = {
  id: AttemptId;
  courseId: CourseId;
  taskId: string;
  studentId: UserId;
  attemptNumber: AttemptNumber;
  submittedAt: string;
};

/** A Teacher's root comment, anchored to a line range of the Attempt diff. */
export type MockReviewComment = {
  id: string;
  authorId: UserId;
  filePath: string;
  side: ReviewCommentSide;
  lineNumber: number;
  endSide?: ReviewCommentSide;
  endLineNumber?: number;
  html: string;
  createdAt: string;
  updatedAt: string;
};

export type MockReviewRevision = {
  number: ReviewRevision;
  grade: Grade;
  overallFeedbackHtml: string;
  comments: MockReviewComment[];
  publishedAt: string;
  publishedBy: UserId;
};

/** Replies sit next to their root comment, outside every revision. */
export type MockReviewReply = {
  id: string;
  commentId: string;
  authorId: UserId;
  html: string;
  createdAt: string;
  updatedAt: string;
};

/** The published Review of one Attempt: its latest revision and replies. */
export type MockReview = {
  attemptId: AttemptId;
  revision: MockReviewRevision;
  replies: MockReviewReply[];
};

export type MockBackendState = {
  users: MockUser[];
  courses: MockCourse[];
  memberships: MockCourseMembership[];
  tasks: MockTask[];
  attempts: MockAttempt[];
  reviews: MockReview[];
  /**
   * Attempts whose Review changed since their Student last looked. Temporary:
   * REV8 replaces it with the Read State of the Review.
   */
  unseenAttemptUpdates: AttemptId[];
  /** The browser's sign-in session; MSW serves one client at a time. */
  session: MockSession | null;
  /** Sequence for identities created at runtime, so they repeat across runs. */
  nextUserNumber: number;
};

/** The parts of a User's name that other participants see. */
export function mockUserName({
  lastName,
  firstName,
  patronymic,
}: MockUser): FullName {
  // Like the backend `UserSummary`, omits the patronymic a User has not got.
  return patronymic
    ? { lastName, firstName, patronymic }
    : { lastName, firstName };
}

export const SESSION_EXPIRES_AT = '2099-12-31T23:59:59.999Z';

export function mockUserId(sequence: number): UserId {
  return v.parse(
    UserIdSchema,
    `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
  );
}

// mit-teacher teaches «Современные информационные технологии» and studies in
// every other dev course. mit-student belongs only to that course.
export const seededUsers = {
  mitTeacher: {
    id: mockUserId(1),
    username: v.parse(UsernameSchema, 'mit-teacher'),
    email: 'mit-teacher@example.com',
    password: 'Teacher123',
    firstName: 'Преподаватель',
    lastName: 'СИТ',
    patronymic: '',
    avatarURL: '',
  },
  mitStudent: {
    id: mockUserId(2),
    username: v.parse(UsernameSchema, 'mit-student'),
    email: 'mit-student@example.com',
    password: 'Student123',
    firstName: 'Студент',
    lastName: 'СИТ',
    patronymic: '',
    avatarURL: '',
  },
  // The existing Review demos link to this Student's immutable submissions.
  student: {
    id: mockUserId(3),
    username: v.parse(UsernameSchema, 'student'),
    email: 'student@example.com',
    password: 'Student123',
    firstName: 'Сергей',
    lastName: 'Студентов',
    patronymic: '',
    avatarURL: '',
  },
} satisfies Record<string, MockUser>;

function accessUser(
  sequence: number,
  username: string,
  firstName: string
): MockUser {
  return {
    id: mockUserId(sequence),
    username: v.parse(UsernameSchema, username),
    email: `${username}@example.com`,
    password: 'Access123',
    firstName,
    lastName: '',
    patronymic: '',
    avatarURL: '',
  };
}

function teacherProfile(user: MockUser): Teacher {
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    patronymic: user.patronymic,
  };
}

const accessUsers = {
  anna: accessUser(1, 'anna', 'Анна'),
  boris: accessUser(2, 'boris', 'Борис'),
  sasha: accessUser(3, 'sasha', 'Саша'),
  petya: accessUser(4, 'petya', 'Петя'),
  vera: accessUser(5, 'vera', 'Вера'),
  guest: accessUser(6, 'guest', 'Гость'),
};

export const accessWorld = {
  users: accessUsers,
  courses: {
    algorithms: {
      id: v.parse(CourseIdSchema, '20000000-0000-4000-8000-000000000001'),
      slug: v.parse(CourseSlugSchema, 'algorithms'),
      accessState: 'open',
      title: 'Алгоритмы',
      shortTitle: 'Алгоритмы',
      color: 'teal',
      iconName: 'code-xml',
      teachers: [
        teacherProfile(accessUsers.anna),
        teacherProfile(accessUsers.boris),
      ],
    },
    databases: {
      id: v.parse(CourseIdSchema, '20000000-0000-4000-8000-000000000002'),
      slug: v.parse(CourseSlugSchema, 'databases'),
      accessState: 'open',
      title: 'Базы данных',
      shortTitle: 'БД',
      color: 'blue',
      iconName: 'database',
      teachers: [teacherProfile(accessUsers.vera)],
    },
  } satisfies Record<string, MockCourse>,
  missingSlug: v.parse(CourseSlugSchema, 'missing-course'),
};

const devMemberships: MockCourseMembership[] = seededCourses.flatMap(
  (course) => {
    const isMit = course.slug === 'modern-information-technologies';
    const teacherMembership: MockCourseMembership = {
      courseId: course.id,
      userId: seededUsers.mitTeacher.id,
      role: isMit ? 'teacher' : 'student',
    };
    return isMit
      ? [
          teacherMembership,
          {
            courseId: course.id,
            userId: seededUsers.mitStudent.id,
            role: 'student',
          },
          {
            courseId: course.id,
            userId: seededUsers.student.id,
            role: 'student',
          },
        ]
      : [teacherMembership];
  }
);

const accessMemberships: MockCourseMembership[] = [
  {
    courseId: accessWorld.courses.algorithms.id,
    userId: accessUsers.anna.id,
    role: 'teacher',
  },
  {
    courseId: accessWorld.courses.algorithms.id,
    userId: accessUsers.boris.id,
    role: 'teacher',
  },
  {
    courseId: accessWorld.courses.algorithms.id,
    userId: accessUsers.sasha.id,
    role: 'student',
  },
  {
    courseId: accessWorld.courses.algorithms.id,
    userId: accessUsers.petya.id,
    role: 'student',
  },
  {
    courseId: accessWorld.courses.algorithms.id,
    userId: accessUsers.vera.id,
    role: 'student',
  },
  {
    courseId: accessWorld.courses.databases.id,
    userId: accessUsers.vera.id,
    role: 'teacher',
  },
];

function mockAttempt(
  sequence: number,
  courseId: CourseId,
  studentId: UserId,
  attemptNumber: number,
  submittedAt: string
): MockAttempt {
  return {
    id: v.parse(
      AttemptIdSchema,
      `30000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
    ),
    courseId,
    taskId: '1',
    studentId,
    attemptNumber: v.parse(AttemptNumberSchema, attemptNumber),
    submittedAt,
  };
}

const reviewAttempts = [
  mockAttempt(
    1,
    accessWorld.courses.algorithms.id,
    accessUsers.sasha.id,
    1,
    '2026-05-20T09:00:00.000Z'
  ),
  mockAttempt(
    2,
    accessWorld.courses.algorithms.id,
    accessUsers.sasha.id,
    2,
    '2026-05-22T09:00:00.000Z'
  ),
  mockAttempt(
    3,
    accessWorld.courses.algorithms.id,
    accessUsers.petya.id,
    1,
    '2026-05-21T09:00:00.000Z'
  ),
];

// Sasha's Attempt #1 is reviewed by both Teachers; the rest have no Review.
const sashaFirstReview: MockReview = {
  attemptId: reviewAttempts[0].id,
  revision: {
    number: v.parse(ReviewRevisionSchema, 2),
    grade: v.parse(GradeSchema, 7.5),
    overallFeedbackHtml:
      '<p>Сортировка работает, но пустой список не обработан.</p>',
    comments: [
      {
        id: 'comment-anna-main-2',
        authorId: accessUsers.anna.id,
        filePath: 'src/main.ts',
        side: 'additions',
        lineNumber: 2,
        html: '<p>Сумму можно посчитать через <code>reduce</code>.</p>',
        createdAt: '2026-05-20T12:00:00.000Z',
        updatedAt: '2026-05-20T12:00:00.000Z',
      },
      {
        id: 'comment-boris-readme-3',
        authorId: accessUsers.boris.id,
        filePath: 'README.md',
        side: 'additions',
        lineNumber: 3,
        html: '<p>Опишите, как запустить решение.</p>',
        createdAt: '2026-05-20T13:00:00.000Z',
        updatedAt: '2026-05-20T13:00:00.000Z',
      },
    ],
    publishedAt: '2026-05-20T13:05:00.000Z',
    publishedBy: accessUsers.boris.id,
  },
  replies: [
    {
      id: 'reply-sasha-main-2',
      commentId: 'comment-anna-main-2',
      authorId: accessUsers.sasha.id,
      html: '<p>Перепишу во второй попытке.</p>',
      createdAt: '2026-05-20T15:00:00.000Z',
      updatedAt: '2026-05-20T15:00:00.000Z',
    },
  ],
};

export const reviewWorld = {
  ...accessWorld,
  task: {
    courseId: accessWorld.courses.algorithms.id,
    id: '1',
    title: 'Сортировки',
    maxGrade: v.parse(GradeSchema, 10),
    deadlineAt: '2026-05-25T20:59:59.000Z',
  },
  attempts: reviewAttempts,
  reviews: [sashaFirstReview],
  // Sasha has not looked at the Review of Attempt #1 yet.
  unseenAttemptUpdates: [sashaFirstReview.attemptId],
};

const DEV_FIRST_SUBMISSION = Date.UTC(2026, 4, 20, 12, 0, 0);
const DEV_SUBMISSION_STEP = 36 * 60 * 60 * 1000;

type MockWorld = 'dev' | 'world:access' | 'world:review';

function createDevState(): MockBackendState {
  const users = Object.values(seededUsers);
  const attempts = devMemberships
    .filter(({ role }) => role === 'student')
    .flatMap(({ courseId, userId }, index) =>
      Array.from({ length: 4 }, (_, number) =>
        mockAttempt(
          100 + index * 4 + number,
          courseId,
          userId,
          number + 1,
          new Date(
            DEV_FIRST_SUBMISSION + number * DEV_SUBMISSION_STEP
          ).toISOString()
        )
      )
    );
  const reviews = attempts
    .filter(({ courseId }) =>
      devMemberships.some(
        (membership) =>
          membership.courseId === courseId &&
          membership.userId === seededUsers.mitTeacher.id &&
          membership.role === 'teacher'
      )
    )
    .flatMap((attempt) => devReview(attempt, seededUsers.mitTeacher.id) ?? []);
  return {
    users,
    courses: seededCourses,
    memberships: devMemberships,
    tasks: seededCourses.map(({ id }) => ({
      courseId: id,
      id: '1',
      title: 'Вводное практическое задание',
      maxGrade: v.parse(GradeSchema, 10),
      deadlineAt: '2026-05-26T20:59:59.000Z',
    })),
    attempts,
    // Only the Course the demo Teacher teaches has Reviews.
    reviews,
    // The two latest Reviews of every Student are not seen yet.
    unseenAttemptUpdates: attempts
      .filter(
        ({ id, attemptNumber }) =>
          attemptNumber >= 2 &&
          reviews.some(({ attemptId }) => attemptId === id)
      )
      .map(({ id }) => id),
    session: {
      userId: seededUsers.mitTeacher.id,
      expiresAt: SESSION_EXPIRES_AT,
    },
    nextUserNumber: users.length + 1,
  };
}

function createAccessState(): MockBackendState {
  const users = Object.values(accessWorld.users);
  return {
    users,
    courses: Object.values(accessWorld.courses),
    memberships: accessMemberships,
    tasks: [],
    attempts: [],
    reviews: [],
    unseenAttemptUpdates: [],
    session: {
      userId: accessWorld.users.anna.id,
      expiresAt: SESSION_EXPIRES_AT,
    },
    nextUserNumber: users.length + 1,
  };
}

function createReviewState(): MockBackendState {
  return {
    ...createAccessState(),
    tasks: [reviewWorld.task],
    attempts: reviewWorld.attempts,
    reviews: reviewWorld.reviews,
    unseenAttemptUpdates: reviewWorld.unseenAttemptUpdates,
  };
}

function seed(world: MockWorld): MockBackendState {
  switch (world) {
    case 'dev':
      return structuredClone(createDevState());
    case 'world:access':
      return structuredClone(createAccessState());
    case 'world:review':
      return structuredClone(createReviewState());
  }
}

let state = seed('dev');

export const mockBackend = {
  get state(): MockBackendState {
    return state;
  },
  /** Returns to a cloned world; the normal development world is the default. */
  reset(world: MockWorld = 'dev') {
    state = seed(world);
  },
};
