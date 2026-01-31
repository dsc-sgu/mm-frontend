import { DynamicIcon } from 'lucide-react/dynamic';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

import { cn } from '@/lib/utils';

export type LucideIconName = keyof typeof dynamicIconImports;

export type CourseCardColor =
  | 'blue'
  | 'teal'
  | 'violet'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'green';

export type Teacher = {
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  username: string;
};

export type CourseCardProps = {
  title: string;
  courseId: string;
  teachers: Teacher[];
  iconName: LucideIconName;
  color: CourseCardColor;
  className?: string;
};

const BG: Record<
  CourseCardColor,
  { base: string; darkBase: string; icon: string; darkIcon: string }
> = {
  blue: {
    base: 'from-blue-100 to-blue-200',
    darkBase: 'dark:from-blue-950 dark:to-blue-900',
    icon: 'text-blue-700/25',
    darkIcon: 'dark:text-blue-300/15',
  },
  teal: {
    base: 'from-teal-100 to-teal-200',
    darkBase: 'dark:from-teal-950 dark:to-teal-900',
    icon: 'text-teal-700/25',
    darkIcon: 'dark:text-teal-300/15',
  },
  violet: {
    base: 'from-violet-100 to-violet-200',
    darkBase: 'dark:from-violet-950 dark:to-violet-900',
    icon: 'text-violet-700/25',
    darkIcon: 'dark:text-violet-300/15',
  },
  pink: {
    base: 'from-pink-100 to-pink-200',
    darkBase: 'dark:from-pink-950 dark:to-pink-900',
    icon: 'text-pink-700/25',
    darkIcon: 'dark:text-pink-300/15',
  },
  red: {
    base: 'from-red-100 to-red-200',
    darkBase: 'dark:from-red-950 dark:to-red-900',
    icon: 'text-red-700/25',
    darkIcon: 'dark:text-red-300/15',
  },
  orange: {
    base: 'from-orange-100 to-orange-200',
    darkBase: 'dark:from-orange-950 dark:to-orange-900',
    icon: 'text-orange-700/25',
    darkIcon: 'dark:text-orange-300/15',
  },
  yellow: {
    base: 'from-yellow-100 to-yellow-200',
    darkBase: 'dark:from-yellow-950 dark:to-yellow-900',
    icon: 'text-yellow-800/25',
    darkIcon: 'dark:text-yellow-300/15',
  },
  lime: {
    base: 'from-lime-100 to-lime-200',
    darkBase: 'dark:from-lime-950 dark:to-lime-900',
    icon: 'text-lime-800/25',
    darkIcon: 'dark:text-lime-300/15',
  },
  green: {
    base: 'from-green-100 to-green-200',
    darkBase: 'dark:from-green-950 dark:to-green-900',
    icon: 'text-green-800/25',
    darkIcon: 'dark:text-green-300/15',
  },
};

function teacherFullName(t: Teacher) {
  return [t.lastName, t.firstName, t.patronymic || '']
    .filter(Boolean)
    .join(' ');
}

export function CourseCard({
  courseId,
  title,
  teachers,
  iconName,
  color,
  className,
}: CourseCardProps) {
  const bg = BG[color];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        'bg-linear-to-br',
        bg.base,
        bg.darkBase,
        'transition-shadow duration-150 hover:shadow-md',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6">
        <DynamicIcon
          name={iconName}
          className={cn(
            'h-36 w-36 rotate-12 stroke-[1.5]',
            'transition-transform duration-200 group-hover:rotate-10',
            bg.icon,
            bg.darkIcon
          )}
        />
      </div>

      <div className="relative p-6">
        <a
          href={`/courses/${courseId}`}
          className={cn(
            'block pr-16',
            'text-xl font-semibold leading-snug tracking-tight text-foreground hover:underline',
            'wrap-break-word',
            'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          {title}
        </a>

        <div className="mt-5 text-sm text-foreground/90">
          <div className="font-semibold text-md text-foreground/90">
            Преподаватели:
          </div>

          <div className="mt-2 flex flex-col gap-1">
            {teachers.map((teacher) => {
              return (
                <a
                  key={teacher.username}
                  href={`/@${teacher.username}`}
                  className={cn(
                    'w-fit rounded-sm underline-offset-4 hover:underline',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                >
                  {teacherFullName(teacher)}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
