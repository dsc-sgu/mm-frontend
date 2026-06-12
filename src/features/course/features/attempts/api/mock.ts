import {
  applyReviewLockUpdatesToAttempts,
  type CourseAttemptReviewLockUpdate,
} from '@/features/course/features/attempts/model/lock-updates';
import type {
  CourseAttempt,
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
  CourseAttemptsListResult,
  SaveQuickGradesInput,
} from '@/features/course/features/attempts/model/types';

const BUN_RUST_COURSE_SLUG = 'modern-information-technologies';

const BUN_RUST_TASK: CourseAttemptTask = {
  id: '13',
  title: 'Переписать Bun с Zig на Rust',
  maxScore: 100,
};

const ANTHROPIC_STUDENT: CourseAttemptStudent = {
  username: 'anthropic',
  fullName: 'Anthropic',
  group: 'AI Lab',
  subgroup: 'Claude',
};

const MOCK_TASKS: CourseAttemptTask[] = [
  { id: '1', title: 'Вводное практическое задание', maxScore: 10 },
  { id: '2', title: 'Анализ pull request и диффов', maxScore: 10 },
  { id: '3', title: 'Работа с ветками Git', maxScore: 8 },
  { id: '4', title: 'Покрытие кода тестами', maxScore: 12 },
  { id: '5', title: 'Проектирование REST API', maxScore: 15 },
  { id: '6', title: 'Рефакторинг legacy-модуля', maxScore: 15 },
  { id: '7', title: 'Оптимизация SQL-запросов', maxScore: 20 },
  { id: '8', title: 'Интеграция с очередью сообщений', maxScore: 20 },
  { id: '9', title: 'Настройка CI/CD pipeline', maxScore: 10 },
  { id: '10', title: 'Безопасность пользовательского ввода', maxScore: 18 },
  { id: '11', title: 'Наблюдаемость и логирование', maxScore: 12 },
  { id: '12', title: 'Итоговый мини-проект', maxScore: 25 },
];

const FIRST_NAMES = [
  'Сергей',
  'Алиса',
  'Борис',
  'Иван',
  'Мария',
  'Никита',
  'Ольга',
  'Пётр',
  'Надежда',
  'Мила',
  'Артём',
  'Екатерина',
  'Даниил',
  'Анна',
  'Максим',
];

const LAST_NAMES = [
  'Студентов',
  'Миронова',
  'Иванов',
  'Петрова',
  'Смирнов',
  'Кузнецова',
  'Попов',
  'Васильева',
  'Соколов',
  'Новикова',
  'Фёдоров',
  'Морозова',
  'Волков',
  'Алексеева',
  'Лебедев',
  'Семёнова',
  'Егоров',
  'Павлова',
  'Козлов',
  'Орлова',
];

const USERNAMES = ['student', 'alice', 'bob'];

const TEACHERS = [
  'Елизавета Громова',
  'Павел Ковалев',
  'Артём Кудяков',
  'Инна Батраева',
];

const MOCK_STUDENTS = buildMockStudents();
const attemptsByCourse = new Map<string, CourseAttempt[]>();

function buildMockStudents(): CourseAttemptStudent[] {
  return Array.from({ length: 60 }, (_, index) => ({
    username:
      USERNAMES[index] ?? `student-${String(index + 1).padStart(2, '0')}`,
    fullName: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[index % LAST_NAMES.length]}`,
    group: `БПИ-${231 + (index % 8)}`,
    subgroup: String((index % 2) + 1),
  }));
}

function getStudents(): CourseAttemptStudent[] {
  return MOCK_STUDENTS;
}

function getCourseStudents(courseSlug: string): CourseAttemptStudent[] {
  if (courseSlug !== BUN_RUST_COURSE_SLUG) {
    return getStudents();
  }

  return [ANTHROPIC_STUDENT, ...getStudents()];
}

function getCourseTasks(courseSlug: string): CourseAttemptTask[] {
  if (courseSlug !== BUN_RUST_COURSE_SLUG) {
    return MOCK_TASKS;
  }

  return [BUN_RUST_TASK, ...MOCK_TASKS];
}

function buildAttempts(courseSlug: string): CourseAttempt[] {
  const attempts: CourseAttempt[] = [];
  const students = getStudents();
  const baseSubmittedMs = Date.UTC(2026, 4, 20, 9, 30, 0);

  students.forEach((student, studentIndex) => {
    const attemptsPerStudent = studentIndex % 4 === 0 ? 3 : 2;

    for (
      let attemptIndex = 0;
      attemptIndex < attemptsPerStudent;
      attemptIndex += 1
    ) {
      const serial = attempts.length + 1;
      const task =
        MOCK_TASKS[(studentIndex * 2 + attemptIndex * 3) % MOCK_TASKS.length];
      const submittedMs =
        baseSubmittedMs +
        (studentIndex * 9 + attemptIndex * 31) * 60 * 60 * 1000;
      const submittedLate = (studentIndex + attemptIndex) % 5 === 0;
      const deadlineMs =
        submittedMs + (submittedLate ? -6 : 28) * 60 * 60 * 1000;
      const graded = (studentIndex + attemptIndex) % 3 === 0;
      const locked = !graded && (studentIndex + attemptIndex) % 17 === 0;
      const scoreRatio =
        0.55 + ((studentIndex * 7 + attemptIndex * 11) % 40) / 100;
      const score = Number((task.maxScore * scoreRatio).toFixed(1));

      attempts.push({
        id: `${courseSlug}:attempt:${serial}`,
        attemptNumber: ((studentIndex + attemptIndex) % 3) + 1,
        task,
        student,
        submittedAt: new Date(submittedMs).toISOString(),
        deadlineAt: new Date(deadlineMs).toISOString(),
        diff: {
          addedLines: 24 + ((studentIndex * 37 + attemptIndex * 83) % 720),
          deletedLines: 2 + ((studentIndex * 19 + attemptIndex * 29) % 180),
        },
        grade: graded
          ? {
              score,
              maxScore: task.maxScore,
              gradedAt: new Date(
                submittedMs + 18 * 60 * 60 * 1000
              ).toISOString(),
              gradedBy:
                TEACHERS[(studentIndex + attemptIndex) % TEACHERS.length],
            }
          : null,
        reviewLock: locked
          ? {
              teacherName: TEACHERS[(studentIndex + 3) % TEACHERS.length],
              lockedAt: new Date(
                submittedMs + 2 * 60 * 60 * 1000
              ).toISOString(),
            }
          : null,
      });
    }
  });

  if (courseSlug === BUN_RUST_COURSE_SLUG) {
    attempts.unshift(buildBunRustAttempt(courseSlug));
  }

  return attempts;
}

function buildBunRustAttempt(courseSlug: string): CourseAttempt {
  return {
    id: `${courseSlug}:attempt:bun-rust-anthropic`,
    attemptNumber: 1,
    task: BUN_RUST_TASK,
    student: ANTHROPIC_STUDENT,
    submittedAt: '2026-05-25T17:40:00.000Z',
    deadlineAt: '2026-06-01T20:59:00.000Z',
    diff: {
      addedLines: 923_586,
      deletedLines: 3_676,
    },
    grade: null,
    reviewLock: null,
  };
}

function getCourseAttempts(courseSlug: string): CourseAttempt[] {
  const stored = attemptsByCourse.get(courseSlug);

  if (stored) {
    return stored;
  }

  const attempts = buildAttempts(courseSlug);
  attemptsByCourse.set(courseSlug, attempts);
  return attempts;
}

function filterAttempts(
  attempts: CourseAttempt[],
  filters: CourseAttemptsFilters
): CourseAttempt[] {
  return attempts.filter((attempt) => {
    const taskMatches =
      filters.tasks.length === 0 || filters.tasks.includes(attempt.task.id);
    const studentMatches =
      filters.students.length === 0 ||
      filters.students.includes(attempt.student.username);
    const gradedMatches =
      filters.graded === 'any' ||
      (filters.graded === 'yes'
        ? attempt.grade !== null
        : attempt.grade === null);

    return taskMatches && studentMatches && gradedMatches;
  });
}

export async function fetchCourseAttemptsList({
  courseSlug,
  filters,
}: {
  courseSlug: string;
  filters: CourseAttemptsFilters;
}): Promise<CourseAttemptsListResult> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const attempts = getCourseAttempts(courseSlug);

  return {
    attempts: filterAttempts(attempts, filters),
    tasks: getCourseTasks(courseSlug),
    students: getCourseStudents(courseSlug),
  };
}

export function createMockReviewLockUpdates(
  courseSlug: string
): CourseAttemptReviewLockUpdate[] {
  const attempts = getCourseAttempts(courseSlug);
  const lockedAttempts = attempts.filter((attempt) => attempt.reviewLock);
  const unlockedAttempts = attempts.filter(
    (attempt) => !attempt.grade && !attempt.reviewLock
  );
  const shouldUnlock = lockedAttempts.length > 0 && Math.random() < 0.35;

  const targetAttempt = shouldUnlock
    ? lockedAttempts[Math.floor(Math.random() * lockedAttempts.length)]
    : unlockedAttempts[Math.floor(Math.random() * unlockedAttempts.length)];

  if (!targetAttempt) {
    return [];
  }

  const updates: CourseAttemptReviewLockUpdate[] = [
    {
      attemptId: targetAttempt.id,
      reviewLock: shouldUnlock
        ? null
        : {
            teacherName: TEACHERS[Math.floor(Math.random() * TEACHERS.length)],
            lockedAt: new Date().toISOString(),
          },
    },
  ];

  attemptsByCourse.set(
    courseSlug,
    applyReviewLockUpdatesToAttempts(attempts, updates)
  );

  return updates;
}

export function findMockCourseAttempt({
  courseSlug,
  taskId,
  studentUsername,
  attemptNumber,
}: {
  courseSlug: string;
  taskId: string;
  studentUsername: string;
  attemptNumber: number;
}): CourseAttempt | undefined {
  return getCourseAttempts(courseSlug).find(
    (attempt) =>
      attempt.task.id === taskId &&
      attempt.student.username === studentUsername &&
      attempt.attemptNumber === attemptNumber
  );
}

export function upsertMockCourseAttemptGrade({
  courseSlug,
  taskId,
  studentUsername,
  attemptNumber,
  score,
  gradedAt,
  gradedBy,
}: {
  courseSlug: string;
  taskId: string;
  studentUsername: string;
  attemptNumber: number;
  score: number;
  gradedAt: string;
  gradedBy: string;
}): void {
  const updatedAttempts = getCourseAttempts(courseSlug).map((attempt) => {
    if (
      attempt.task.id !== taskId ||
      attempt.student.username !== studentUsername ||
      attempt.attemptNumber !== attemptNumber
    ) {
      return attempt;
    }

    return {
      ...attempt,
      grade: {
        score,
        maxScore: attempt.task.maxScore,
        gradedAt,
        gradedBy,
      },
    };
  });

  attemptsByCourse.set(courseSlug, updatedAttempts);
}

export async function saveQuickGrades({
  courseSlug,
  updates,
}: SaveQuickGradesInput): Promise<CourseAttempt[]> {
  await new Promise((resolve) => setTimeout(resolve, 220));

  const now = new Date().toISOString();
  const updateById = new Map(
    updates.map((update) => [update.attemptId, update])
  );

  const updatedAttempts = getCourseAttempts(courseSlug).map((attempt) => {
    const update = updateById.get(attempt.id);
    if (!update || attempt.reviewLock) {
      return attempt;
    }

    return {
      ...attempt,
      grade: {
        score: update.score,
        maxScore: attempt.task.maxScore,
        gradedAt: now,
        gradedBy: 'Текущий преподаватель',
      },
    };
  });

  attemptsByCourse.set(courseSlug, updatedAttempts);
  return updatedAttempts;
}
