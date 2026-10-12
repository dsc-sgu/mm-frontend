import dynamicIconImports from 'lucide-react/dynamicIconImports';
import * as v from 'valibot';
import type { Username } from '@/features/auth/model/identity';
import type { CourseId, CourseSlug } from '@/features/course/model/identity';

export const CourseColorSchema = v.picklist([
  'blue',
  'teal',
  'violet',
  'pink',
  'red',
  'orange',
  'green',
]);
export type CourseColor = v.InferOutput<typeof CourseColorSchema>;

export const CourseIconNameSchema = v.custom<keyof typeof dynamicIconImports>(
  (input) =>
    typeof input === 'string' && Object.hasOwn(dynamicIconImports, input)
);
export type LucideIconName = v.InferOutput<typeof CourseIconNameSchema>;

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
