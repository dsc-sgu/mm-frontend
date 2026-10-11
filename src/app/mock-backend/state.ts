// The single stateful mock backend shared by every MSW handler. Handlers live
// with their features and read or change this state; the state itself always
// starts from the same deterministic seed.

export type MockUser = {
  id: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  role: string;
  avatarURL: string;
};

export type MockSession = {
  userId: string;
  expiresAt: string;
};

export type MockBackendState = {
  users: MockUser[];
  /** The browser's sign-in session; MSW serves one client at a time. */
  session: MockSession | null;
  /** Sequence for identities created at runtime, so they repeat across runs. */
  nextUserNumber: number;
};

export const SESSION_EXPIRES_AT = '2099-12-31T23:59:59.999Z';

export function mockUserId(sequence: number) {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

// Usernames match the course mocks: mit-teacher teaches «Современные
// информационные технологии» and studies in every other mock course.
export const seededUsers = {
  mitTeacher: {
    id: mockUserId(1),
    username: 'mit-teacher',
    email: 'mit-teacher@example.com',
    password: 'Teacher123',
    firstName: 'Преподаватель',
    lastName: 'СИТ',
    patronymic: '',
    role: 'teacher',
    avatarURL: '',
  },
  mitStudent: {
    id: mockUserId(2),
    username: 'mit-student',
    email: 'mit-student@example.com',
    password: 'Student123',
    firstName: 'Студент',
    lastName: 'СИТ',
    patronymic: '',
    role: 'student',
    avatarURL: '',
  },
} satisfies Record<string, MockUser>;

function seed(): MockBackendState {
  return {
    users: Object.values(seededUsers).map((user) => ({ ...user })),
    session: {
      userId: seededUsers.mitTeacher.id,
      expiresAt: SESSION_EXPIRES_AT,
    },
    nextUserNumber: Object.keys(seededUsers).length + 1,
  };
}

let state = seed();

export const mockBackend = {
  get state(): MockBackendState {
    return state;
  },
  /** Returns to the seed: between tests, and on every page load in dev. */
  reset() {
    state = seed();
  },
};
