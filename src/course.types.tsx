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
