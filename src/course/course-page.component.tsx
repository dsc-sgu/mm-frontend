import { DynamicIcon } from 'lucide-react/dynamic';
import { BookOpen, Users } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import { CourseContentBlocks } from './course-content-block.component';
import type { CoursePage as CoursePageModel } from './course-page.types';
import { COURSE_COLOR_THEMES } from './course-theme';
import type { Teacher } from './course.types';

type CoursePageProps = {
  course: CoursePageModel;
};

function teacherFullName(teacher: Teacher) {
  return [teacher.lastName, teacher.firstName, teacher.patronymic || '']
    .filter(Boolean)
    .join(' ');
}

export function CoursePage({ course }: CoursePageProps) {
  const theme = COURSE_COLOR_THEMES[course.color];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section
        className={cn(
          'relative overflow-hidden rounded-3xl border bg-linear-to-br p-6 shadow-sm sm:p-8 lg:p-10',
          theme.base,
          theme.darkBase,
          theme.border
        )}
      >
        <DynamicIcon
          name={course.iconName}
          className={cn(
            'pointer-events-none absolute -right-8 -top-8 size-56 rotate-12 stroke-[1.35] sm:size-72',
            theme.icon,
            theme.darkIcon
          )}
          aria-hidden="true"
        />

        <div className="relative max-w-3xl">
          <div
            className={cn(
              'mb-5 inline-flex items-center gap-2 rounded-full bg-background/75 px-3 py-1 text-sm font-medium shadow-sm backdrop-blur dark:bg-background/50',
              theme.accent
            )}
          >
            <BookOpen className="size-4" aria-hidden="true" />
            Страница курса
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {course.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-foreground/85 sm:text-lg">
            {course.description}
          </p>

          <div className="mt-8 rounded-2xl bg-background/70 p-4 shadow-sm backdrop-blur dark:bg-background/45">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Users className="size-4" aria-hidden="true" />
              Преподаватели
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {course.teachers.map((teacher) => (
                <a
                  key={teacher.username}
                  href={`/@${teacher.username}`}
                  className="w-fit rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {teacherFullName(teacher)}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <article className="rounded-3xl border border-border bg-card px-5 py-6 shadow-sm sm:px-8 lg:px-10">
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

export function CoursePageNotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-center sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Курс не найден</h1>
        <p className="mt-3 text-muted-foreground">
          Не удалось загрузить материалы этого курса. Проверьте ссылку или
          вернитесь к списку курсов.
        </p>
      </section>
    </main>
  );
}
