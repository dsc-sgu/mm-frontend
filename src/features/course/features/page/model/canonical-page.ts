import { omitUndefined } from '@/features/course/model/omit-undefined';
import { normalizeRichText } from '@/features/course/model/rich-text';
import { editDocument } from '@/features/course/features/page-document/model/document';
import type { CoursePage } from './types';

/** Canonical pages omit optional fields whose value is undefined. */
export function canonicalizeCoursePage(page: CoursePage): CoursePage {
  const document = editDocument(page.content);
  return {
    ...page,
    content: document.status === 'supported' ? document.blocks : page.content,
    teachers: page.teachers.map(omitUndefined),
    resources: {
      ...page.resources,
      files: page.resources.files.map(omitUndefined),
    },
    taskSummaries: page.taskSummaries.map((summary) => {
      if (summary.status === 'unavailable') return summary;
      return omitUndefined({
        ...summary,
        description:
          summary.description && normalizeRichText(summary.description),
      });
    }),
  };
}
