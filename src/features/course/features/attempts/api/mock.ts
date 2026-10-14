import * as v from 'valibot';
import { GradeSchema, type Grade } from '@/features/course/model/grade';
import {
  AttemptNumberSchema,
  type AttemptNumber,
  type CourseId,
} from '@/features/course/model/identity';
import { mockBackend } from '@/app/mock-backend/state';
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

const grade = (value: number): Grade => v.parse(GradeSchema, value);

const MOCK_TASKS: CourseAttemptTask[] = [
  { id: '1', title: 'Вводное практическое задание', maxGrade: grade(10) },
  { id: '2', title: 'Анализ pull request и диффов', maxGrade: grade(10) },
  { id: '3', title: 'Работа с ветками Git', maxGrade: grade(8) },
  { id: '4', title: 'Покрытие кода тестами', maxGrade: grade(12) },
  { id: '5', title: 'Проектирование REST API', maxGrade: grade(15) },
  { id: '6', title: 'Рефакторинг legacy-модуля', maxGrade: grade(15) },
  { id: '7', title: 'Оптимизация SQL-запросов', maxGrade: grade(20) },
  { id: '8', title: 'Интеграция с очередью сообщений', maxGrade: grade(20) },
  { id: '9', title: 'Настройка CI/CD pipeline', maxGrade: grade(10) },
  {
    id: '10',
    title: 'Безопасность пользовательского ввода',
    maxGrade: grade(18),
  },
  { id: '11', title: 'Наблюдаемость и логирование', maxGrade: grade(12) },
  { id: '12', title: 'Итоговый мини-проект', maxGrade: grade(25) },
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

export const MOCK_STUDENTS = buildMockStudents();
// RAM attempts are addressed by the CourseId the Course lookup returns.
const attemptsByCourse = new Map<CourseId, CourseAttempt[]>();

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

function buildAttempts(courseId: CourseId): CourseAttempt[] {
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
      const gradeRatio =
        0.55 + ((studentIndex * 7 + attemptIndex * 11) % 40) / 100;
      const gradeValue = grade(
        Number(((task.maxGrade.thousandths / 1000) * gradeRatio).toFixed(1))
      );

      attempts.push({
        id: `${courseId}:attempt:${serial}`,
        attemptNumber: v.parse(
          AttemptNumberSchema,
          ((studentIndex + attemptIndex) % 3) + 1
        ),
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
              value: gradeValue,
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

  return attempts;
}

function getCourseAttempts(courseId: CourseId): CourseAttempt[] {
  const stored = attemptsByCourse.get(courseId);

  if (stored) {
    return stored;
  }

  const attempts = buildAttempts(courseId);
  attemptsByCourse.set(courseId, attempts);
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
  courseId,
  filters,
}: {
  courseId: CourseId;
  filters: CourseAttemptsFilters;
}): Promise<CourseAttemptsListResult> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const attempts = getCourseAttempts(courseId);

  return {
    attempts: filterAttempts(attempts, filters),
    tasks: MOCK_TASKS,
    students: getStudents(),
  };
}

export function createMockReviewLockUpdates(
  courseId: CourseId
): CourseAttemptReviewLockUpdate[] {
  const attempts = getCourseAttempts(courseId);
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
    courseId,
    applyReviewLockUpdatesToAttempts(attempts, updates)
  );

  return updates;
}

export function findMockCourseAttempt({
  courseId,
  taskId,
  studentUsername,
  attemptNumber,
}: {
  courseId: CourseId;
  taskId: string;
  studentUsername: string;
  attemptNumber: AttemptNumber;
}): CourseAttempt | undefined {
  return getCourseAttempts(courseId).find(
    (attempt) =>
      attempt.task.id === taskId &&
      attempt.student.username === studentUsername &&
      attempt.attemptNumber === attemptNumber
  );
}

export function upsertMockCourseAttemptGrade({
  courseId,
  taskId,
  studentUsername,
  attemptNumber,
  grade,
  gradedAt,
  gradedBy,
}: {
  courseId: CourseId;
  taskId: string;
  studentUsername: string;
  attemptNumber: AttemptNumber;
  grade: Grade;
  gradedAt: string;
  gradedBy: string;
}): void {
  const updatedAttempts = getCourseAttempts(courseId).map((attempt) => {
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
        value: grade,
        gradedAt,
        gradedBy,
      },
    };
  });

  attemptsByCourse.set(courseId, updatedAttempts);
}

export async function saveQuickGrades({
  courseId,
  updates,
}: SaveQuickGradesInput): Promise<CourseAttempt[]> {
  await new Promise((resolve) => setTimeout(resolve, 220));
  const user = mockBackend.state.users.find(
    ({ id }) => id === mockBackend.state.session?.userId
  );
  if (!user) throw new Error('No signed-in User to save grades');

  const now = new Date().toISOString();
  const updateById = new Map(
    updates.map((update) => [update.attemptId, update])
  );

  const updatedAttempts = getCourseAttempts(courseId).map((attempt) => {
    const update = updateById.get(attempt.id);
    if (!update || attempt.reviewLock) {
      return attempt;
    }

    return {
      ...attempt,
      grade: {
        value: update.grade,
        gradedAt: now,
        gradedBy: [user.lastName, user.firstName, user.patronymic]
          .filter(Boolean)
          .join(' '),
      },
    };
  });

  attemptsByCourse.set(courseId, updatedAttempts);
  return updatedAttempts;
}
