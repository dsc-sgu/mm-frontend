import * as v from 'valibot';
import { mockBackend, type MockCourse } from '@/app/mock-backend/state';
import { GradeSchema } from '@/features/course/model/grade';
import type {
  CourseContentBlockItem,
  CoursePage,
  CoursePageResources,
  SaveCoursePageInput,
} from '@/features/course/features/page/model/types';
import {
  CourseSlugSchema,
  type CourseId,
} from '@/features/course/model/identity';
// PROTOTYPE (#181): the sandbox Course Page with 14 Task References.
import { buildPrototypeCoursePage } from '@/features/course/prototype/task-and-deadline-settings/fixture';

type CoursePageSummary = Omit<
  CoursePage,
  'description' | 'resources' | 'content'
>;

const COURSE_DESCRIPTIONS: Record<string, string> = {
  'algorithms-and-data-structures':
    'Практический курс о классических алгоритмах, структурах данных и способах оценивать сложность решений до того, как код попадёт в продакшен.',
  databases:
    'Курс помогает разобраться в моделировании данных, SQL, транзакциях и проектировании надёжного слоя хранения для прикладных систем.',
  'programming-languages':
    'Разбираем, как устроены языки программирования: типы, интерпретаторы, компиляторы и выразительные средства современных экосистем.',
  'frontend-engineering':
    'Курс про инженерный подход к интерфейсам: архитектура, состояние, доступность, производительность и качество пользовательского опыта.',
  'operating-systems':
    'Изучаем процессы, память, файловые системы, конкурентность и то, как операционная система связывает железо с пользовательскими программами.',
  'computer-networks':
    'От сетевых моделей и маршрутизации до HTTP, диагностики и практик построения устойчивых распределённых приложений.',
  'modern-information-technologies':
    'Обзор современных технологий разработки: командная работа, веб-платформы, облачная инфраструктура и безопасная доставка изменений.',
};

// Keyed by canonical Course objects: resetting the backend also resets these
// lazily generated RAM pages, and renaming a slug keeps the same Course.
const COURSE_PAGE_STORE = new WeakMap<MockCourse, CoursePage>();

function cloneCoursePage(course: CoursePage): CoursePage {
  return structuredClone(course);
}

function createCoursePage(course: MockCourse): CoursePage {
  if (course.page) return cloneCoursePage(course.page);
  const summary: CoursePageSummary = {
    courseId: course.slug,
    title: course.title,
    shortTitle: course.shortTitle,
    color: course.color,
    iconName: course.iconName,
    teachers: course.teachers,
  };
  const description =
    COURSE_DESCRIPTIONS[course.slug] ??
    'Материалы курса, задания и полезные ссылки собраны в одном месте.';

  // PROTOTYPE (#181): «Современные информационные технологии» is the sandbox.
  if (course.slug === 'modern-information-technologies') {
    return { ...summary, description, ...buildPrototypeCoursePage() };
  }

  return {
    ...summary,
    description,
    resources: buildCourseResources(summary),
    content: buildCourseContent(summary),
  };
}

function ensureCoursePage(courseId: CourseId): CoursePage | null {
  const course = findCourse(courseId);
  if (!course) {
    return null;
  }

  const storedPage = COURSE_PAGE_STORE.get(course);
  if (storedPage) {
    return storedPage;
  }

  const page = createCoursePage(course);
  COURSE_PAGE_STORE.set(course, page);
  return page;
}

// RAM operations address the same CourseId the Course lookup returns.
function findCourse(courseId: CourseId): MockCourse | undefined {
  return mockBackend.state.courses.find(({ id }) => id === courseId);
}

function buildCourseResources(course: CoursePageSummary): CoursePageResources {
  return {
    images: [
      {
        id: `${course.courseId}:image:workspace`,
        src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
        alt: 'Рабочее место студента с ноутбуком и заметками',
        caption: [
          {
            id: `${course.courseId}:image:workspace:caption`,
            type: 'text',
            text: 'Материалы курса рассчитаны на работу в браузере, редакторе кода и системе контроля версий.',
          },
        ],
      },
    ],
    files: [
      {
        id: `${course.courseId}:files:syllabus`,
        name: 'Силлабус курса.pdf',
        href: `/courses/${course.courseId}/files`,
        size: '420 KB',
        mimeType: 'application/pdf',
      },
      {
        id: `${course.courseId}:files:rubric`,
        name: 'Критерии оценивания.md',
        href: `/courses/${course.courseId}/files`,
        size: '18 KB',
        mimeType: 'text/markdown',
      },
    ],
    assignments: [
      {
        taskId: '1',
        title: 'Вводное практическое задание',
        description: [
          {
            id: `${course.courseId}:assignment:1:description`,
            type: 'text',
            text: 'Покажите, что окружение готово, и отправьте первый небольшой результат.',
          },
        ],
        dueDate: '2026-06-01T20:59:00Z',
        maxGrade: v.parse(GradeSchema, 10),
      },
    ],
  };
}

function buildCourseContent(
  course: CoursePageSummary
): CourseContentBlockItem[] {
  return [
    {
      id: `${course.courseId}:intro`,
      rank: 'a0',
      type: 'heading',
      level: 2,
      children: [
        {
          id: `${course.courseId}:intro:title`,
          type: 'text',
          text: 'О курсе',
        },
      ],
    },
    {
      id: `${course.courseId}:welcome`,
      rank: 'b0',
      type: 'paragraph',
      children: [
        {
          id: `${course.courseId}:welcome:lead`,
          type: 'text',
          text: 'Добро пожаловать на курс ',
        },
        {
          id: `${course.courseId}:welcome:title`,
          type: 'text',
          text: course.title,
          marks: ['bold'],
        },
        {
          id: `${course.courseId}:welcome:body`,
          type: 'text',
          text: '. Здесь собраны материалы, задания и ориентиры, которые помогут двигаться по темам последовательно.',
        },
      ],
    },
    {
      id: `${course.courseId}:outcomes`,
      rank: 'c0',
      type: 'heading',
      level: 3,
      children: [
        {
          id: `${course.courseId}:outcomes:title`,
          type: 'text',
          text: 'Что получится к концу модуля',
        },
      ],
    },
    {
      id: `${course.courseId}:outcomes-list`,
      rank: 'd0',
      type: 'list',
      items: [
        {
          id: `${course.courseId}:outcomes-list:practice`,
          rank: 'b0',
          variant: 'unordered',
          children: [
            {
              id: `${course.courseId}:outcomes-list:practice:text`,
              type: 'text',
              text: 'Разобрать ключевые понятия на коротких практических примерах.',
            },
          ],
        },
        {
          id: `${course.courseId}:outcomes-list:project`,
          rank: 'c0',
          variant: 'unordered',
          children: [
            {
              id: `${course.courseId}:outcomes-list:project:text`,
              type: 'text',
              text: 'Собрать мини-проект и оформить решение для проверки.',
            },
          ],
        },
        {
          id: `${course.courseId}:outcomes-list:discussion`,
          rank: 'a0',
          variant: 'unordered',
          children: [
            {
              id: `${course.courseId}:outcomes-list:discussion:text`,
              type: 'text',
              text: 'Научиться объяснять решения и обсуждать компромиссы.',
            },
          ],
        },
      ],
    },
    {
      id: `${course.courseId}:quote`,
      rank: 'e0',
      type: 'quote',
      children: [
        {
          id: `${course.courseId}:quote:text`,
          type: 'text',
          text: 'Материалы курса лучше проходить небольшими итерациями: прочитать, попробовать, получить обратную связь и улучшить решение.',
          marks: ['italic'],
        },
      ],
    },
    {
      id: `${course.courseId}:workflow`,
      rank: 'f0',
      type: 'heading',
      level: 3,
      children: [
        {
          id: `${course.courseId}:workflow:title`,
          type: 'text',
          text: 'Рекомендуемый порядок работы',
        },
      ],
    },
    {
      id: `${course.courseId}:workflow-list`,
      rank: 'g0',
      type: 'list',
      items: [
        {
          id: `${course.courseId}:workflow-list:lecture`,
          rank: 'a0',
          variant: 'ordered',
          children: [
            {
              id: `${course.courseId}:workflow-list:lecture:text`,
              type: 'text',
              text: 'Просмотрите конспект и отметьте непонятные места.',
            },
          ],
        },
        {
          id: `${course.courseId}:workflow-list:practice`,
          rank: 'b0',
          variant: 'ordered',
          children: [
            {
              id: `${course.courseId}:workflow-list:practice:text`,
              type: 'text',
              text: 'Выполните практикум и приложите результат к заданию.',
            },
          ],
        },
        {
          id: `${course.courseId}:workflow-list:review`,
          rank: 'c0',
          variant: 'ordered',
          children: [
            {
              id: `${course.courseId}:workflow-list:review:text`,
              type: 'text',
              text: 'Сверьтесь с чек-листом и отправьте работу на ревью.',
            },
          ],
        },
      ],
    },
    {
      id: `${course.courseId}:spoiler`,
      rank: 'h0',
      type: 'spoiler',
      title: [
        {
          id: `${course.courseId}:spoiler:title`,
          type: 'text',
          text: 'Подсказки для первого задания',
        },
      ],
      defaultOpen: false,
      children: [
        {
          id: `${course.courseId}:spoiler:note`,
          rank: 'b0',
          type: 'paragraph',
          children: [
            {
              id: `${course.courseId}:spoiler:note:text`,
              type: 'text',
              text: 'Начните с маленького примера и проверьте граничные случаи до основного решения.',
            },
          ],
        },
        {
          id: `${course.courseId}:spoiler:link`,
          rank: 'a0',
          type: 'paragraph',
          children: [
            {
              id: `${course.courseId}:spoiler:link:before`,
              type: 'text',
              text: 'Если застряли, откройте ',
            },
            {
              id: `${course.courseId}:spoiler:link:files`,
              type: 'link',
              text: 'страницу файлов курса',
              href: `/courses/${course.courseId}/files`,
              linkType: 'internal',
            },
            {
              id: `${course.courseId}:spoiler:link:after`,
              type: 'text',
              text: ' и найдите дополнительные материалы.',
            },
          ],
        },
      ],
    },
    {
      id: `${course.courseId}:code`,
      rank: 'i0',
      type: 'code',
      language: 'ts',
      fileName: 'checklist.ts',
      code: "const steps = ['read', 'practice', 'review'];\n\nexport function isReady(done: string[]) {\n  return steps.every((step) => done.includes(step));\n}",
    },
    {
      id: `${course.courseId}:image`,
      rank: 'j0',
      type: 'image',
      imageId: `${course.courseId}:image:workspace`,
    },
    {
      id: `${course.courseId}:files`,
      rank: 'k0',
      type: 'files',
      fileIds: [
        `${course.courseId}:files:syllabus`,
        `${course.courseId}:files:rubric`,
      ],
    },
    {
      id: `${course.courseId}:assignment`,
      rank: 'l0',
      type: 'assignment',
      taskId: '1',
    },
    {
      id: `${course.courseId}:external`,
      rank: 'm0',
      type: 'paragraph',
      children: [
        {
          id: `${course.courseId}:external:before`,
          type: 'text',
          text: 'Для дополнительного чтения используйте ',
        },
        {
          id: `${course.courseId}:external:mdn`,
          type: 'link',
          text: 'MDN Web Docs',
          href: 'https://developer.mozilla.org/',
          linkType: 'external',
          marks: ['bold'],
        },
        {
          id: `${course.courseId}:external:after`,
          type: 'text',
          text: ' и материалы, которые преподаватели публикуют в течение семестра.',
        },
      ],
    },
  ];
}

export async function fetchCoursePage(
  courseId: CourseId
): Promise<CoursePage | null> {
  await new Promise((resolve) => setTimeout(resolve, 150));

  const page = ensureCoursePage(courseId);

  return page ? cloneCoursePage(page) : null;
}

export async function saveCoursePage(
  input: SaveCoursePageInput
): Promise<CoursePage> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const currentPage = ensureCoursePage(input.courseId);
  const currentCourse = findCourse(input.courseId);

  if (!currentPage || !currentCourse) {
    throw new Error(`Course page not found: ${input.courseId}`);
  }

  const nextCourseSummary: CoursePageSummary = {
    courseId: input.slug,
    title: input.title,
    shortTitle: input.shortTitle,
    color: input.color,
    iconName: input.iconName,
    teachers: currentPage.teachers,
  };

  const nextPage: CoursePage = {
    ...nextCourseSummary,
    teachers: currentPage.teachers,
    description: input.description,
    resources: input.resources ?? currentPage.resources,
    content: input.content,
  };

  // Only card metadata and the route slug change. Stable Course identity and
  // every membership remain attached to the same canonical Course.
  Object.assign(currentCourse, {
    slug: v.parse(CourseSlugSchema, input.slug),
    title: input.title,
    shortTitle: input.shortTitle,
    color: input.color,
    iconName: input.iconName,
  });
  if (currentCourse.page) currentCourse.page = cloneCoursePage(nextPage);
  COURSE_PAGE_STORE.set(currentCourse, cloneCoursePage(nextPage));

  return cloneCoursePage(nextPage);
}
