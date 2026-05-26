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
  { id: '3', title: 'Итоговый мини-проект', maxScore: 25 },
];

const STUDENTS_BY_COURSE: Record<string, CourseAttemptStudent[]> = {
  'algorithms-and-data-structures': [
    {
      username: 'student',
      fullName: 'Сергей Студентов',
      group: 'БПИ-231',
      subgroup: '1',
    },
    {
      username: 'alice',
      fullName: 'Алиса Миронова',
      group: 'БПИ-231',
      subgroup: '2',
    },
    {
      username: 'bob',
      fullName: 'Борис Иванов',
      group: 'БПИ-232',
      subgroup: '1',
    },
    {
      username: 'ivan-ivanov',
      fullName: 'Иван Иванов',
      group: 'БПИ-232',
      subgroup: '2',
    },
  ],
  databases: [
    {
      username: 'student',
      fullName: 'Сергей Студентов',
      group: 'БПИ-231',
      subgroup: '1',
    },
    {
      username: 'alice',
      fullName: 'Алиса Миронова',
      group: 'БПИ-231',
      subgroup: '2',
    },
    {
      username: 'petr-petrov',
      fullName: 'Пётр Петров',
      group: 'БПИ-233',
      subgroup: '1',
    },
  ],
  'programming-languages': [
    {
      username: 'student',
      fullName: 'Сергей Студентов',
      group: 'БПИ-231',
      subgroup: '1',
    },
    {
      username: 'bob',
      fullName: 'Борис Иванов',
      group: 'БПИ-232',
      subgroup: '1',
    },
    {
      username: 'maria-ivanova',
      fullName: 'Мария Иванова',
      group: 'БПИ-234',
      subgroup: '2',
    },
  ],
  'frontend-engineering': [
    {
      username: 'student',
      fullName: 'Сергей Студентов',
      group: 'БПИ-231',
      subgroup: '1',
    },
    {
      username: 'alice',
      fullName: 'Алиса Миронова',
      group: 'БПИ-231',
      subgroup: '2',
    },
    {
      username: 'frontend-student',
      fullName: 'Никита Вёрсткин',
      group: 'БПИ-235',
      subgroup: '1',
    },
  ],
  'operating-systems': [
    {
      username: 'student',
      fullName: 'Сергей Студентов',
      group: 'БПИ-231',
      subgroup: '1',
    },
    {
      username: 'bob',
      fullName: 'Борис Иванов',
      group: 'БПИ-232',
      subgroup: '1',
    },
    {
      username: 'os-student',
      fullName: 'Ольга Системина',
      group: 'БПИ-236',
      subgroup: '2',
    },
  ],
  'computer-networks': [
    {
      username: 'student',
      fullName: 'Сергей Студентов',
      group: 'БПИ-231',
      subgroup: '1',
    },
    {
      username: 'alice',
      fullName: 'Алиса Миронова',
      group: 'БПИ-231',
      subgroup: '2',
    },
    {
      username: 'network-student',
      fullName: 'Надежда Сетевая',
      group: 'БПИ-237',
      subgroup: '1',
    },
  ],
  'modern-information-technologies': [
    {
      username: 'student',
      fullName: 'Сергей Студентов',
      group: 'БПИ-231',
      subgroup: '1',
    },
    {
      username: 'mit-student',
      fullName: 'Мила Технологова',
      group: 'БПИ-238',
      subgroup: '2',
    },
    {
      username: 'bob',
      fullName: 'Борис Иванов',
      group: 'БПИ-232',
      subgroup: '1',
    },
  ],
};

const FALLBACK_STUDENTS: CourseAttemptStudent[] = [
  {
    username: 'student',
    fullName: 'Сергей Студентов',
    group: 'БПИ-231',
    subgroup: '1',
  },
];

const attemptsByCourse = new Map<string, CourseAttempt[]>();

function getStudents(courseSlug: string): CourseAttemptStudent[] {
  return STUDENTS_BY_COURSE[courseSlug] ?? FALLBACK_STUDENTS;
}

function buildAttempts(courseSlug: string): CourseAttempt[] {
  const students = getStudents(courseSlug);
  const [
    firstStudent,
    secondStudent = firstStudent,
    thirdStudent = firstStudent,
  ] = students;
  const [introTask, diffTask, projectTask] = MOCK_TASKS;

  return [
    {
      id: `${courseSlug}:attempt:1`,
      attemptNumber: 1,
      task: introTask,
      student: firstStudent,
      submittedAt: '2026-05-20T13:25:00Z',
      deadlineAt: '2026-05-21T20:59:00Z',
      diff: { addedLines: 128, deletedLines: 14 },
      grade: null,
      feedbackText: 'Хороший старт, стоит уточнить обработку ошибок.',
      reviewLock: null,
    },
    {
      id: `${courseSlug}:attempt:2`,
      attemptNumber: 2,
      task: introTask,
      student: secondStudent,
      submittedAt: '2026-05-22T07:42:00Z',
      deadlineAt: '2026-05-21T20:59:00Z',
      diff: { addedLines: 86, deletedLines: 7 },
      grade: {
        score: 8,
        maxScore: introTask.maxScore,
        gradedAt: '2026-05-23T10:15:00Z',
        gradedBy: 'Елизавета Громова',
      },
      feedbackText: 'Зачтено, но дедлайн был превышен.',
      reviewLock: null,
    },
    {
      id: `${courseSlug}:attempt:3`,
      attemptNumber: 1,
      task: diffTask,
      student: thirdStudent,
      submittedAt: '2026-05-24T15:10:00Z',
      deadlineAt: '2026-05-25T20:59:00Z',
      diff: { addedLines: 204, deletedLines: 61 },
      grade: null,
      feedbackText: '',
      reviewLock: {
        teacherName: 'Инна Батраева',
        lockedAt: '2026-05-25T09:20:00Z',
      },
    },
    {
      id: `${courseSlug}:attempt:4`,
      attemptNumber: 3,
      task: diffTask,
      student: firstStudent,
      submittedAt: '2026-05-25T18:40:00Z',
      deadlineAt: '2026-05-25T20:59:00Z',
      diff: { addedLines: 52, deletedLines: 19 },
      grade: {
        score: 9,
        maxScore: diffTask.maxScore,
        gradedAt: '2026-05-26T08:35:00Z',
        gradedBy: 'Павел Ковалев',
      },
      feedbackText: 'Отлично разобраны крайние случаи.',
      reviewLock: null,
    },
    {
      id: `${courseSlug}:attempt:5`,
      attemptNumber: 1,
      task: projectTask,
      student: secondStudent,
      submittedAt: '2026-05-26T12:05:00Z',
      deadlineAt: '2026-05-30T20:59:00Z',
      diff: { addedLines: 642, deletedLines: 103 },
      grade: null,
      feedbackText: 'Черновой отзыв будет заменён после финального ревью.',
      reviewLock: null,
    },
    {
      id: `${courseSlug}:attempt:6`,
      attemptNumber: 2,
      task: projectTask,
      student: thirdStudent,
      submittedAt: '2026-05-31T06:30:00Z',
      deadlineAt: '2026-05-30T20:59:00Z',
      diff: { addedLines: 318, deletedLines: 75 },
      grade: {
        score: 21,
        maxScore: projectTask.maxScore,
        gradedAt: '2026-06-01T11:45:00Z',
        gradedBy: 'Артём Кудяков',
      },
      feedbackText: 'Сильная работа, нужно упростить README.',
      reviewLock: null,
    },
  ];
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
    students: getStudents(courseSlug),
  };
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
