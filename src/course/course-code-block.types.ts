export type CourseCodeBlockProps = {
  code: string;
  language?: string;
  fileName?: string;
};

export type CopyState = 'idle' | 'copied' | 'failed';
