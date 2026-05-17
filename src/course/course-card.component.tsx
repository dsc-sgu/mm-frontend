import { Link } from '@tanstack/react-router';
import { DynamicIcon } from 'lucide-react/dynamic';

import { cn } from '@/shadcn/lib/utils';
import { COURSE_COLOR_THEMES } from './course-theme';
import type { CourseColor, LucideIconName, Teacher } from './course.types';

export type CourseCardProps = {
  title: string;
  courseId: string;
  teachers: Teacher[];
  iconName: LucideIconName;
  color: CourseColor;
  className?: string;
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
  const bg = COURSE_COLOR_THEMES[color];

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
        <Link
          to="/courses/$courseSlug"
          params={{ courseSlug: courseId }}
          className={cn(
            'block pr-16',
            'text-xl font-semibold leading-snug tracking-tight text-foreground hover:underline',
            'wrap-break-word',
            'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          {title}
        </Link>

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

export function CourseCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative min-h-48 overflow-hidden rounded-2xl border border-border/60',
        'bg-linear-to-br from-muted/80 via-muted/45 to-background',
        'shadow-xs animate-pulse',
        className
      )}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6">
        <div className="h-36 w-36 rotate-12 rounded-[2rem] bg-background/45 dark:bg-foreground/8" />
      </div>

      <div className="relative p-6">
        <div className="h-6 w-3/4 rounded-full bg-foreground/12 dark:bg-foreground/14" />
        <div className="mt-3 h-6 w-1/2 rounded-full bg-foreground/10 dark:bg-foreground/12" />

        <div className="mt-7 h-4 w-32 rounded-full bg-foreground/12 dark:bg-foreground/14" />

        <div className="mt-3 flex flex-col gap-2">
          <div className="h-4 w-56 max-w-[70%] rounded-full bg-foreground/10 dark:bg-foreground/12" />
          <div className="h-4 w-44 max-w-[55%] rounded-full bg-foreground/8 dark:bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}
