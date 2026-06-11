import type { CourseSummary } from '../../course.types';

export type RichTextMark = 'bold' | 'italic';

export type RichTextTextNode = {
  id: string;
  type: 'text';
  text: string;
  marks?: RichTextMark[];
};

export type RichTextLinkNode = {
  id: string;
  type: 'link';
  text: string;
  href: string;
  linkType: 'internal' | 'external';
  marks?: RichTextMark[];
};

export type RichTextNode = RichTextTextNode | RichTextLinkNode;

export type RankedContent = {
  id: string;
  rank: string;
};

export type CourseParagraphBlock = RankedContent & {
  type: 'paragraph';
  children: RichTextNode[];
};

export type CourseHeadingBlock = RankedContent & {
  type: 'heading';
  level: 1 | 2 | 3;
  children: RichTextNode[];
};

export type CourseQuoteBlock = RankedContent & {
  type: 'quote';
  children: RichTextNode[];
};

export type CourseListItem = RankedContent & {
  children: RichTextNode[];
};

export type CourseListBlock = RankedContent & {
  type: 'list';
  variant: 'ordered' | 'unordered';
  items: CourseListItem[];
};

export type CourseSpoilerBlock = RankedContent & {
  type: 'spoiler';
  title: RichTextNode[];
  children: CourseContentBlockItem[];
  defaultOpen?: boolean;
};

export type CourseCodeBlock = RankedContent & {
  type: 'code';
  code: string;
  language?: string;
  fileName?: string;
};

export type CourseImageBlock = RankedContent & {
  type: 'image';
  src: string;
  alt: string;
  caption?: RichTextNode[];
};

export type CourseFileItem = {
  id: string;
  name: string;
  href: string;
  size?: string;
  mimeType?: string;
};

export type CourseFilesBlock = RankedContent & {
  type: 'files';
  files: CourseFileItem[];
};

export type CourseAssignmentBlock = RankedContent & {
  type: 'assignment';
  taskId: string;
  title: string;
  description?: RichTextNode[];
  dueDate?: string;
  maxScore?: number;
};

// TODO: Надо что-то сделать с неймингом DTOшек и компонентов,
// и что у них могут быть коллизии
export type CourseContentBlockItem =
  | CourseParagraphBlock
  | CourseHeadingBlock
  | CourseQuoteBlock
  | CourseListBlock
  | CourseSpoilerBlock
  | CourseCodeBlock
  | CourseImageBlock
  | CourseFilesBlock
  | CourseAssignmentBlock;

export type CoursePage = CourseSummary & {
  description: string;
  content: CourseContentBlockItem[];
};
