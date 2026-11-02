import type { Grade } from '@/features/course/model/grade';
import type { CourseId } from '@/features/course/model/identity';
import type { CourseSummary } from '@/features/course/model/types';
import type { RichTextNode } from '@/features/course/model/rich-text';
import type {
  DocumentBlock,
  PublishedReadBlock,
} from '@/features/course/features/page-document/model/document';

export type {
  RichTextNode,
  RichTextMark,
} from '@/features/course/model/rich-text';

export type CourseContentBlockItem = DocumentBlock;

export type CourseHeadingBlock = Extract<
  DocumentBlock,
  { type: 'heading' }
>['data'];

type CourseImageResource = {
  id: string;
  src: string;
};

export type CourseFileResource = {
  id: string;
  name: string;
  href: string;
  size?: string;
  mimeType?: string;
};

type TaskSummaryData = {
  taskId: string;
  title: string;
  description?: RichTextNode[];
  dueDate?: string;
  maxGrade?: Grade;
};

export type CoursePageResources = {
  images: CourseImageResource[];
  files: CourseFileResource[];
};

export type CoursePage = Pick<
  CourseSummary,
  'title' | 'shortTitle' | 'teachers' | 'iconName' | 'color'
> & {
  courseId: CourseId;
  slug: string;
  description: string;
  resources: CoursePageResources;
  taskSummaries: TaskSummary[];
  content: CourseContentBlockItem[];
};

export type PublishedCoursePage = Omit<CoursePage, 'content'> & {
  content: PublishedReadBlock[];
};

export type SaveCoursePageInput = {
  /** The stable address; the slug below is only editable metadata. */
  courseId: CourseId;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  color: CourseSummary['color'];
  iconName: CourseSummary['iconName'];
  content: DocumentBlock[];
  resources?: CoursePageResources;
};

export type TaskSummary =
  | { status: 'unavailable'; taskId: string }
  | ({ status: 'open' } & TaskSummaryData)
  | ({ status: 'locked'; prerequisite: string } & TaskSummaryData)
  | ({ status: 'teacher' } & TaskSummaryData);
