import { describe, expect, it } from 'vitest';
import type { CoursePage } from '@/features/course/features/page/model/types';
import type { CourseId } from '@/features/course/model/identity';
import { getCoursePageEditWorkingCopyState } from './working-copy';

describe('getCoursePageEditWorkingCopyState', () => {
  it('keeps the page clean when optional resource and summary fields become explicit undefined', () => {
    const page: CoursePage = {
      courseId: '20000000-0000-4000-8000-000000000001' as CourseId,
      slug: 'course',
      title: 'Course',
      shortTitle: 'C',
      description: '',
      color: 'blue',
      iconName: 'book',
      teachers: [],
      content: [],
      resources: {
        images: [],
        files: [{ id: 'f', name: 'File', href: '/file' }],
      },
      taskSummaries: [{ status: 'open', taskId: 't', title: 'Task' }],
    };
    const copy: CoursePage = {
      ...page,
      resources: {
        ...page.resources,
        files: [
          { ...page.resources.files[0], size: undefined, mimeType: undefined },
        ],
      },
      taskSummaries: [
        {
          status: 'open',
          taskId: 't',
          title: 'Task',
          description: undefined,
          dueDate: undefined,
          maxGrade: undefined,
        },
      ],
    };
    expect(getCoursePageEditWorkingCopyState(page, copy).isDirty).toBe(false);
    expect(
      getCoursePageEditWorkingCopyState(page, { ...copy, title: 'Changed' })
        .isDirty
    ).toBe(true);
  });

  it('keeps the page clean when summary text marks become explicit undefined', () => {
    const page: CoursePage = {
      courseId: '20000000-0000-4000-8000-000000000001' as CourseId,
      slug: 'course',
      title: 'Course',
      shortTitle: 'C',
      description: '',
      color: 'blue',
      iconName: 'book',
      teachers: [],
      content: [],
      resources: { images: [], files: [] },
      taskSummaries: [
        {
          status: 'open',
          taskId: 't',
          title: 'Task',
          description: [{ type: 'text', text: 'Summary' }],
        },
      ],
    };
    const copy: CoursePage = {
      ...page,
      taskSummaries: [
        {
          status: 'open',
          taskId: 't',
          title: 'Task',
          description: [{ type: 'text', text: 'Summary', marks: undefined }],
        },
      ],
    };
    expect(getCoursePageEditWorkingCopyState(page, copy).isDirty).toBe(false);
  });
});
