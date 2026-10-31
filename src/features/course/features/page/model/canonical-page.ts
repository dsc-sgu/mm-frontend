import { normalizeRichText } from '@/features/course/model/rich-text';
import { editDocument } from '@/features/course/features/page-document/model/document';
import type { CoursePage } from './types';

/** Give absent optional fields the same representation as explicit undefined. */
export function canonicalizeCoursePage(page: CoursePage): CoursePage {
  const document = editDocument(page.content);
  return {
    ...page,
    content: document.status === 'supported' ? document.blocks : page.content,
    teachers: page.teachers.map((teacher) => ({
      ...teacher,
      patronymic: teacher.patronymic,
    })),
    resources: {
      ...page.resources,
      files: page.resources.files.map((file) => ({
        ...file,
        size: file.size,
        mimeType: file.mimeType,
      })),
    },
    taskSummaries: page.taskSummaries.map((summary) => {
      if (summary.status === 'unavailable') return summary;
      return {
        ...summary,
        description:
          summary.description && normalizeRichText(summary.description),
        dueDate: summary.dueDate,
        maxGrade: summary.maxGrade,
      };
    }),
  };
}
