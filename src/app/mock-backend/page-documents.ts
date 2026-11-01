import type { MockCourse } from './state';
import { createCoursePage } from './page-seed';
import type { CoursePage } from '@/features/course/features/page/model/types';

export type MockBlockVersion = {
  id: string;
  version: number;
  position: number;
  publication: 'published' | 'draft';
  deleted: boolean;
  block: unknown;
};
type PublishedPage = {
  page: CoursePage;
  versions: MockBlockVersion[];
  studentTaskSummaries: Record<string, CoursePage['taskSummaries']>;
};
const documents = new WeakMap<MockCourse, PublishedPage>();
export function getPageDocument(course: MockCourse): PublishedPage {
  let document = documents.get(course);
  if (!document) {
    const page = createCoursePage(course);
    document = {
      page,
      studentTaskSummaries: {},
      versions: page.content.map((block, position) => ({
        position,
        id: block.id,
        version: 1,
        publication: 'published',
        deleted: false,
        block,
      })),
    };
    documents.set(course, document);
  }
  return document;
}
export function getPublishedPage(course: MockCourse) {
  return structuredClone(getPageDocument(course).page);
}
export function setPublishedPage(course: MockCourse, page: CoursePage) {
  const previous = getPageDocument(course);
  const versions = [...previous.versions];
  for (const block of previous.page.content) {
    if (!page.content.some(({ id }) => id === block.id))
      versions.push({
        id: block.id,
        version:
          Math.max(
            ...versions.filter((v) => v.id === block.id).map((v) => v.version)
          ) + 1,
        publication: 'published',
        deleted: true,
        position: 0,
        block,
      });
  }
  for (const [position, block] of page.content.entries())
    versions.push({
      id: block.id,
      version:
        Math.max(
          0,
          ...versions.filter((v) => v.id === block.id).map((v) => v.version)
        ) + 1,
      publication: 'published',
      deleted: false,
      position,
      block,
    });
  documents.set(course, { ...previous, page: structuredClone(page), versions });
}
