import type { CourseAccessResult } from '@/course/course-access.types';
import type { CourseSummary } from '@/course/course.types';
import type {
  HeaderBreadcrumbItem,
  HeaderDataContext,
  HeaderDataGetter,
  HeaderNavItem,
  HeaderRouteMatch,
  ResolvedHeaderData,
} from './header.types';

type CourseAccess = Extract<CourseAccessResult, { status: 'allowed' }>;

type CourseLoaderData = {
  courseSlug: string;
  courseAccess: CourseAccess;
  course?: CourseSummary;
};

export function resolveHeaderData(
  rawMatches: readonly unknown[]
): ResolvedHeaderData {
  const matches = rawMatches as HeaderRouteMatch[];
  const currentMatch = matches.at(-1);

  if (!currentMatch) {
    return { breadcrumbs: [], navItems: [] };
  }

  const breadcrumbs: HeaderBreadcrumbItem[] = [];
  let navItems: HeaderNavItem[] = [];

  for (const match of matches) {
    const context: HeaderDataContext = { matches, match, currentMatch };
    const header = match.staticData?.header;

    if (header?.getBreadcrumb) {
      breadcrumbs.push(...resolveHeaderValue(header.getBreadcrumb, context));
    }

    if (header?.getNavItems) {
      navItems = resolveHeaderValue(header.getNavItems, context);
    }
  }

  return { breadcrumbs, navItems };
}

function resolveHeaderValue<T>(
  value: T[] | HeaderDataGetter<T[]>,
  context: HeaderDataContext
) {
  return typeof value === 'function' ? value(context) : value;
}

export const getDashboardBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = () => [{ label: 'Панель управления' }];

export const getCourseRootBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug } = getCourseData(context);

  return [
    {
      label: getCourseTitle(context),
      to: '/courses/$courseSlug',
      params: { courseSlug },
    },
  ];
};

export const getCourseNavItems: HeaderDataGetter<HeaderNavItem[]> = (
  context
) => {
  const { courseSlug, courseAccess } = getCourseData(context);
  const params = { courseSlug };

  if (courseAccess.role === 'student') {
    return [
      {
        label: 'Курс',
        to: '/courses/$courseSlug',
        params,
        exact: true,
      },
      {
        label: 'Репозиторий',
        to: '/courses/$courseSlug/repositories/$studentUsername',
        params: { courseSlug, studentUsername: courseAccess.username },
      },
    ];
  }

  return [
    {
      label: 'Курс',
      to: '/courses/$courseSlug',
      params,
      exact: true,
    },
    {
      label: 'Попытки',
      to: '/courses/$courseSlug/attempts',
      params,
    },
    {
      label: 'Репозитории',
      to: '/courses/$courseSlug/repositories',
      params,
    },
    {
      label: 'Журнал',
      to: '/courses/$courseSlug/journal',
      params,
    },
    {
      label: 'Файлы',
      to: '/courses/$courseSlug/files',
      params,
    },
    {
      label: 'Аналитика',
      to: '/courses/$courseSlug/stats',
      params,
    },
    {
      label: 'Редактирование',
      to: '/courses/$courseSlug/edit',
      params,
    },
  ];
};

export function createCourseChildBreadcrumb(
  label: string,
  to?: string
): HeaderDataGetter<HeaderBreadcrumbItem[]> {
  return (context) => {
    const { courseSlug } = getCourseData(context);

    return [
      {
        label,
        to,
        params: to ? { courseSlug } : undefined,
      },
    ];
  };
}

export const getCourseRepositoriesBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug, courseAccess } = getCourseData(context);

  if (courseAccess.role === 'teacher') {
    return [
      {
        label: 'Репозитории',
        to: '/courses/$courseSlug/repositories',
        params: { courseSlug },
      },
    ];
  }

  return [
    {
      label: 'Репозиторий',
      to: '/courses/$courseSlug/repositories/$studentUsername',
      params: { courseSlug, studentUsername: courseAccess.username },
    },
  ];
};

export const getStudentRepositoryBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug, courseAccess } = getCourseData(context);

  if (courseAccess.role === 'student') {
    return [];
  }

  const studentUsername = getParam(context, 'studentUsername');

  return [
    {
      label: formatUsername(studentUsername),
      to: '/courses/$courseSlug/repositories/$studentUsername',
      params: { courseSlug, studentUsername },
    },
  ];
};

export const getRepositoryCommitsBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug } = getCourseData(context);
  const studentUsername = getParam(context, 'studentUsername');

  return [
    {
      label: 'Коммиты',
      to: '/courses/$courseSlug/repositories/$studentUsername/commits',
      params: { courseSlug, studentUsername },
    },
  ];
};

export const getRepositoryCommitDetailBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => [{ label: formatCommitId(getParam(context, 'commitId')) }];

export const getTaskBreadcrumb: HeaderDataGetter<HeaderBreadcrumbItem[]> = (
  context
) => {
  const { courseSlug, courseAccess } = getCourseData(context);
  const taskId = getParam(context, 'taskId');
  const isAttemptRoute = context.currentMatch.pathname.includes('/attempts/');

  if (courseAccess.role === 'teacher' && isAttemptRoute) {
    return [];
  }

  const taskItem: HeaderBreadcrumbItem = {
    label: formatTaskTitle(taskId),
    to: '/courses/$courseSlug/tasks/$taskId',
    params: { courseSlug, taskId },
  };

  if (courseAccess.role === 'teacher') {
    return [{ label: 'Задания' }, taskItem];
  }

  return [taskItem];
};

export const getTaskEditBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = () => [{ label: 'Редактирование' }];

export const getAttemptDiffBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug, courseAccess } = getCourseData(context);
  const attemptId = getParam(context, 'attemptId');

  if (courseAccess.role === 'teacher') {
    return [
      {
        label: 'Попытки',
        to: '/courses/$courseSlug/attempts',
        params: { courseSlug },
      },
      { label: formatAttemptLabel(attemptId) },
    ];
  }

  return [{ label: formatAttemptLabel(attemptId) }];
};

export const getAttemptReviewBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug } = getCourseData(context);
  const attemptId = getParam(context, 'attemptId');

  return [
    {
      label: 'Попытки',
      to: '/courses/$courseSlug/attempts',
      params: { courseSlug },
    },
    { label: `Оценка попытки #${attemptId}` },
  ];
};

function getCourseData(context: HeaderDataContext): CourseLoaderData {
  for (const match of context.matches) {
    if (isCourseLoaderData(match.loaderData)) {
      return match.loaderData;
    }

    if (isCourseLoaderData(match.context)) {
      return match.context;
    }
  }

  const courseSlug = getParam(context, 'courseSlug');

  return {
    courseSlug,
    courseAccess: {
      status: 'allowed',
      courseSlug,
      username: '',
      role: 'student',
      studentUsernames: [],
    },
  };
}

function isCourseLoaderData(value: unknown): value is CourseLoaderData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Partial<CourseLoaderData>;

  return (
    typeof data.courseSlug === 'string' &&
    data.courseAccess?.status === 'allowed' &&
    (data.courseAccess.role === 'student' ||
      data.courseAccess.role === 'teacher')
  );
}

function getCourseTitle(context: HeaderDataContext) {
  const { course, courseSlug } = getCourseData(context);
  return course?.title ?? formatSlug(courseSlug);
}

function getParam(context: HeaderDataContext, key: string) {
  for (let index = context.matches.length - 1; index >= 0; index -= 1) {
    const value = context.matches[index]?.params[key];
    if (value) {
      return value;
    }
  }

  return '';
}

function formatTaskTitle(taskId: string) {
  return `Лабораторная работа ${taskId}`;
}

function formatAttemptLabel(attemptId: string) {
  return `Попытка #${attemptId}`;
}

function formatCommitId(commitId: string) {
  return commitId.length > 7 ? commitId.slice(0, 7) : commitId;
}

function formatUsername(username: string) {
  return username
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
