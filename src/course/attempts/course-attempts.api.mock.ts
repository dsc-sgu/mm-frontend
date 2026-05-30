import {
  applyReviewLockUpdatesToAttempts,
  type CourseAttemptReviewLockUpdate,
} from './course-attempts.lock-updates';
import type {
  CourseAttempt,
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
  CourseAttemptsListResult,
  SaveQuickGradesInput,
} from './course-attempts.types';

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

const FEEDBACK_TEXTS = [
  'Хороший старт, стоит уточнить обработку ошибок.',
  'Зачтено, но дедлайн был превышен.',
  'Отлично разобраны крайние случаи.',
  'Черновой отзыв будет заменён после финального ревью.',
  'Сильная работа, нужно упростить README.',
  '',
];

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
        feedbackText:
          FEEDBACK_TEXTS[(studentIndex + attemptIndex) % FEEDBACK_TEXTS.length],
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
    tasks: MOCK_TASKS,
    students: getStudents(),
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

export async function saveQuickGrades({
  courseSlug,
  updates,
  clearFeedbackText,
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
      feedbackText: clearFeedbackText ? '' : attempt.feedbackText,
    };
  });

  attemptsByCourse.set(courseSlug, updatedAttempts);
  return updatedAttempts;
}
