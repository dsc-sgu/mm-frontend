import dynamicIconImports from 'lucide-react/dynamicIconImports';

export type CourseColor =
  | 'blue'
  | 'teal'
  | 'violet'
  | 'pink'
  | 'red'
  | 'orange'
  | 'green';

export type LucideIconName = keyof typeof dynamicIconImports;

export type Teacher = {
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  username: string;
};

export type CourseSummary = {
  title: string;
  courseId: string;
  teachers: Teacher[];
  iconName: LucideIconName;
  color: CourseColor;
};
