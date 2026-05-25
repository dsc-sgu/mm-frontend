export type CourseCodeBlockProps = {
  code: string;
  language?: string;
  fileName?: string;
};

export type HighlightResult = {
  key: string;
  html: string | null;
};

export type CopyState = 'idle' | 'copied' | 'failed';
