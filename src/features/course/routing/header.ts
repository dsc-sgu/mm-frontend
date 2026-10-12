import type { Session } from '@/features/auth/model/types';
import type { CourseRouteContext } from '@/features/course/routing/context';
import type {
  HeaderBreadcrumbItem,
  HeaderDataContext,
  HeaderDataGetter,
  HeaderNavItem,
} from '@/app/header/model/navigation';

export const getCourseRootBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug, course } = getCourseData(context);

  return [
    {
      label: course.title,
      to: '/courses/$courseSlug',
      params: { courseSlug },
    },
  ];
};

export const getCourseNavItems: HeaderDataGetter<HeaderNavItem[]> = (
  context
) => {
  const { courseSlug, courseRole, session } = getCourseData(context);
  const params = { courseSlug };

  if (courseRole === 'student') {
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
        params: { courseSlug, studentUsername: session.username },
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

export function createCourseSectionBreadcrumb(
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
  const { courseSlug, courseRole, session } = getCourseData(context);

  if (courseRole === 'teacher') {
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
      params: { courseSlug, studentUsername: session.username },
    },
  ];
};

export const getStudentRepositoryBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug, courseRole } = getCourseData(context);

  if (courseRole === 'student') {
    return [];
  }

  const studentUsername = getParam(context, 'studentUsername');

  return [
    {
      label: getStubStudentName(studentUsername),
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
> = (context) => [{ label: formatCommitLabel(getParam(context, 'commitId')) }];

export const getTaskBreadcrumb: HeaderDataGetter<HeaderBreadcrumbItem[]> = (
  context
) => {
  const { courseSlug, courseRole } = getCourseData(context);
  const taskId = getParam(context, 'taskId');
  const isAttemptRoute = context.currentMatch.pathname.includes('/attempts/');

  if (courseRole === 'teacher' && isAttemptRoute) {
    return [];
  }

  const taskItem: HeaderBreadcrumbItem = {
    label: getStubTaskTitle(taskId),
    to: '/courses/$courseSlug/tasks/$taskId',
    params: { courseSlug, taskId },
  };

  if (courseRole === 'teacher') {
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
  const { courseSlug, courseRole } = getCourseData(context);
  const attemptNumber = getParam(context, 'attemptNumber');

  if (courseRole === 'teacher') {
    return [
      {
        label: 'Попытки',
        to: '/courses/$courseSlug/attempts',
        params: { courseSlug },
      },
      { label: formatAttemptLabel(attemptNumber) },
    ];
  }

  return [{ label: formatAttemptLabel(attemptNumber) }];
};

export const getAttemptReviewBreadcrumb: HeaderDataGetter<
  HeaderBreadcrumbItem[]
> = (context) => {
  const { courseSlug } = getCourseData(context);
  const attemptNumber = getParam(context, 'attemptNumber');

  return [
    {
      label: 'Попытки',
      to: '/courses/$courseSlug/attempts',
      params: { courseSlug },
    },
    { label: formatAttemptReviewLabel(attemptNumber) },
  ];
};

function getCourseData(
  context: HeaderDataContext
): CourseRouteContext & { session: Session } {
  for (const match of context.matches) {
    if (
      match.routeId === '/_authenticated/courses/$courseSlug' &&
      match.context.course
    ) {
      return match.context;
    }
  }
  // Header only evaluates Course getters after confirming the root context.
  throw new Error('Course header requires a confirmed Course context');
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

export function formatCommitLabel(commitId: string) {
  return commitId.length > 7 ? commitId.slice(0, 7) : commitId;
}

export function formatAttemptLabel(attemptNumber: string) {
  return `Попытка #${attemptNumber}`;
}

export function formatAttemptReviewLabel(attemptNumber: string) {
  return `Оценка попытки #${attemptNumber}`;
}

// Temporary task/student labels until their detail operations provide names.

export function getStubTaskTitle(taskId: string) {
  return `Задание №${taskId}`;
}

export function getStubStudentName(username: string) {
  return username;
}
