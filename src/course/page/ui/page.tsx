import { DynamicIcon } from 'lucide-react/dynamic';

import { cn } from '@/shadcn/lib/utils';
import { CourseContentBlocks } from '../../course-content-block.component';
import type { CoursePage as CoursePageModel } from '../model/types';
import { COURSE_COLORS } from '../../course.colors';
import type { Teacher } from '../../course.types';

function teacherFullName(teacher: Teacher) {
  return [teacher.lastName, teacher.firstName, teacher.patronymic || '']
    .filter(Boolean)
    .join(' ');
}

export function CoursePage({ course }: { course: CoursePageModel }) {
  const theme = COURSE_COLORS[course.color];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col sm:px-6 sm:py-6 lg:px-8">
      <section
        className={cn(
          'relative overflow-hidden bg-linear-to-br px-5 py-6 sm:rounded-3xl sm:border sm:p-8 lg:p-10',
          theme.base,
          theme.darkBase,
          theme.border
        )}
      >
        <DynamicIcon
          name={course.iconName}
          className={cn(
            'pointer-events-none absolute -right-8 -top-8 hidden size-72 rotate-12 stroke-[1.35] xl:block',
            theme.icon,
            theme.darkIcon
          )}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full sm:max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/85 sm:text-lg">
            {course.description}
          </p>

          <div className="mt-5 flex max-w-2xl flex-col items-start gap-2 sm:flex-row sm:flex-wrap">
            {course.teachers.map((teacher) => (
              <a
                key={teacher.username}
                href={`/@${teacher.username}`}
                className="max-w-full truncate rounded-lg bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {teacherFullName(teacher)}
              </a>
            ))}
          </div>
        </div>
      </section>

      <article className="px-5 pt-2 pb-8 md:mt-8 md:rounded-3xl md:border md:border-border md:bg-card md:px-8 lg:px-10">
        <CourseContentBlocks
          blocks={course.content}
          courseSlug={course.courseId}
        />
      </article>
    </main>
  );
}

export function CoursePageLoading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      aria-busy="true"
    >
      <div className="animate-pulse rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:p-10">
        <div className="h-6 w-36 rounded-full bg-muted" />
        <div className="mt-6 h-10 w-3/4 rounded-full bg-muted" />
        <div className="mt-4 h-6 w-full max-w-2xl rounded-full bg-muted" />
        <div className="mt-3 h-6 w-4/5 max-w-xl rounded-full bg-muted" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="h-12 rounded-xl bg-muted" />
          <div className="h-12 rounded-xl bg-muted" />
        </div>
      </div>
      <div className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="h-8 w-56 rounded-full bg-muted" />
        <div className="h-5 w-full rounded-full bg-muted" />
        <div className="h-5 w-11/12 rounded-full bg-muted" />
        <div className="h-24 rounded-2xl bg-muted" />
      </div>
    </main>
  );
}
