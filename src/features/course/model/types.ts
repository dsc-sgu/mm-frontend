import dynamicIconImports from 'lucide-react/dynamicIconImports';
import type { Username } from '@/features/auth/model/identity';
import type { CourseId, CourseSlug } from '@/features/course/model/identity';

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
  username: Username;
};

export type CourseSummary = {
  title: string;
  shortTitle: string;
  id: CourseId;
  slug: CourseSlug;
  teachers: Teacher[];
  iconName: LucideIconName;
  color: CourseColor;
};
