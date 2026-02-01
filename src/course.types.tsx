import dynamicIconImports from 'lucide-react/dynamicIconImports';

export type CourseCardColor =
  | 'blue'
  | 'teal'
  | 'violet'
  | 'pink'
  | 'red'
  | 'orange'
  | 'green';

export type LucideIconName = keyof typeof dynamicIconImports;
