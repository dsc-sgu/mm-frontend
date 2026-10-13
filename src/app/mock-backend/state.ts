import * as v from 'valibot';
import { seededCourses } from '@/app/mock-backend/courses';
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
};

export type MockAttempt = {
  id: AttemptId;
  courseId: CourseId;
  taskId: string;
  studentId: UserId;
  attemptNumber: AttemptNumber;
};

export type MockBackendState = {
  users: MockUser[];
  courses: MockCourse[];
  memberships: MockCourseMembership[];
  tasks: MockTask[];
  attempts: MockAttempt[];
  /** The browser's sign-in session; MSW serves one client at a time. */
  session: MockSession | null;
  /** Sequence for identities created at runtime, so they repeat across runs. */
  nextUserNumber: number;
};

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
  attemptNumber: number
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
  };
}

export const reviewWorld = {
  ...accessWorld,
  task: {
    courseId: accessWorld.courses.algorithms.id,
    id: '1',
    title: 'Сортировки',
  },
  attempts: [
    mockAttempt(1, accessWorld.courses.algorithms.id, accessUsers.sasha.id, 1),
    mockAttempt(2, accessWorld.courses.algorithms.id, accessUsers.sasha.id, 2),
    mockAttempt(3, accessWorld.courses.algorithms.id, accessUsers.petya.id, 1),
  ],
};

type MockWorld = 'dev' | 'world:access' | 'world:review';

function seed(world: MockWorld): MockBackendState {
  const isAccessWorld = world !== 'dev';
  const users = isAccessWorld
    ? Object.values(accessUsers)
    : Object.values(seededUsers);
  return structuredClone({
    users,
    courses: isAccessWorld ? Object.values(accessWorld.courses) : seededCourses,
    memberships: isAccessWorld ? accessMemberships : devMemberships,
    tasks: isAccessWorld
      ? world === 'world:review'
        ? [reviewWorld.task]
        : []
      : seededCourses.map(({ id }) => ({
          courseId: id,
          id: '1',
          title: 'Вводное практическое задание',
        })),
    attempts: isAccessWorld
      ? world === 'world:review'
        ? reviewWorld.attempts
        : []
      : devMemberships
          .filter(({ role }) => role === 'student')
          .flatMap(({ courseId, userId }, index) =>
            Array.from({ length: 4 }, (_, number) =>
              mockAttempt(
                100 + index * 4 + number,
                courseId,
                userId,
                number + 1
              )
            )
          ),
    session: {
      userId: isAccessWorld ? accessUsers.anna.id : seededUsers.mitTeacher.id,
      expiresAt: SESSION_EXPIRES_AT,
    },
    nextUserNumber: users.length + 1,
  });
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
