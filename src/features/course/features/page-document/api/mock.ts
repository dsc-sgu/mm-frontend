import { http, HttpResponse } from 'msw';
import { accessDenial } from '@/app/mock-backend/participant-access';
import { mockBackend, type MockCourse } from '@/app/mock-backend/state';
import { createCoursePage } from '@/features/course/features/page/api/mock';
import type { TaskSummary } from '@/features/course/features/page/model/types';
import type { DocumentBlock } from '@/features/course/features/page-document/model/document';
import { gradeToNumber } from '@/features/course/model/grade';

type BlockVersion = {
  block: DocumentBlock;
  version: number;
  publication: 'published' | 'draft';
  deleted: boolean;
};

const pageVersions = new WeakMap<MockCourse, BlockVersion[]>();

function versionsFor(course: MockCourse): BlockVersion[] {
  const existing = pageVersions.get(course);
  if (existing) {
    return existing;
  }
  const page = createCoursePage(course);
  const versions: BlockVersion[] = page.content.map((block, index) => ({
    block,
    version: index === 0 ? 2 : 1,
    publication: 'published' as const,
    deleted: false,
  }));
  const first = page.content[0];
  versions.unshift({
    block: {
      ...first,
      data: {
        ...first.data,
        children: [{ type: 'text', text: 'Устаревшая публикация' }],
      },
    } as DocumentBlock,
    version: 1,
    publication: 'published',
    deleted: false,
  });
  versions.push(
    {
      block: {
        id: `${course.id}:deleted`,
        type: 'paragraph',
        data: {
          formatVersion: 1,
          children: [{ type: 'text', text: 'Удалённый блок' }],
        },
      },
      version: 1,
      publication: 'published',
      deleted: true,
    },
    {
      block: {
        ...page.content[1],
        data: {
          ...page.content[1].data,
          children: [{ type: 'text', text: 'Чужой черновик' }],
        },
      } as DocumentBlock,
      version: 2,
      publication: 'draft',
      deleted: false,
    }
  );
  pageVersions.set(course, versions);
  return versions;
}

function latestPublishedBlocks(versions: BlockVersion[]): DocumentBlock[] {
  const latest = new Map<string, BlockVersion>();
  for (const version of versions) {
    if (version.publication !== 'published') {
      continue;
    }
    const current = latest.get(version.block.id);
    if (!current || current.version < version.version) {
      latest.set(version.block.id, version);
    }
  }
  return [...latest.values()]
    .filter(({ deleted }) => !deleted)
    .sort((first, second) => versions.indexOf(first) - versions.indexOf(second))
    .map(({ block }) => block);
}

function studentTaskSummaries(): TaskSummary[] {
  const [open] = createCoursePage(mockBackend.state.courses[0]).taskSummaries;
  return [
    open,
    {
      status: 'locked',
      taskId: '2',
      title: 'Закрытое задание',
      prerequisite: 'Сначала выполните вводное практическое задание',
    },
    { status: 'unavailable', taskId: '3' },
  ];
}

function teacherTaskSummaries(studentSummaries: TaskSummary[]): TaskSummary[] {
  return studentSummaries.map((summary) => {
    if (summary.status === 'unavailable') {
      return summary;
    }
    return {
      status: 'teacher',
      taskId: summary.taskId,
      title: summary.title,
      description: summary.description,
      dueDate: summary.dueDate,
      maxGrade: summary.maxGrade,
    };
  });
}

export const publishedCoursePageHandlers = [
  http.get('/api/v1/courses/:courseId/page/published', ({ params }) => {
    const { users, session, courses, memberships } = mockBackend.state;
    if (!session || !users.some(({ id }) => id === session.userId)) {
      return accessDenial('unauthenticated');
    }
    const course = courses.find(({ id }) => id === params.courseId);
    const membership = memberships.find(
      ({ courseId, userId }) =>
        courseId === course?.id && userId === session.userId
    );
    if (!course || !membership) {
      return accessDenial('not-found');
    }

    const page = createCoursePage(course);
    const versions = versionsFor(course);
    const blocks = latestPublishedBlocks(versions).map((block) => ({
      ...block,
      version: versions.find(
        (version) => version.block.id === block.id && version.block === block
      )?.version,
    }));
    const studentSummaries = studentTaskSummaries();
    const taskSummaries =
      membership.role === 'teacher'
        ? teacherTaskSummaries(studentSummaries)
        : studentSummaries;
    return HttpResponse.json({
      courseId: page.courseId,
      slug: page.slug,
      title: page.title,
      shortTitle: page.shortTitle,
      description: page.description,
      color: page.color,
      iconName: page.iconName,
      teachers: page.teachers.map((teacher) => {
        const user = users.find(
          ({ username }) => username === teacher.username
        );
        if (!user) {
          throw new Error(`Unknown Teacher fixture: ${teacher.username}`);
        }
        return user;
      }),
      resources: page.resources,
      viewerRole: membership.role,
      blocks,
      taskSummaries: taskSummaries.map((summary) =>
        'maxGrade' in summary && summary.maxGrade
          ? { ...summary, maxGrade: gradeToNumber(summary.maxGrade) }
          : summary
      ),
    });
  }),
];
