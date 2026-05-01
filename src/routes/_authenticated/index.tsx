import { CourseCard } from '@/course/course-card.component';
import { useCoursesQuery } from '@/course/use-courses-query.hook';
import { DeadlinesCalendar } from '@/deadlines-calendar/deadlines-calendar.component';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export const Route = createFileRoute('/_authenticated/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: courses = [], isPending } = useCoursesQuery();

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-muted/30 xl:h-[calc(100vh-3.5rem)] xl:overflow-hidden">
      <div className="box-border h-full px-4 py-6 md:px-6 lg:px-8">
        <div className="grid w-full gap-6 xl:h-full xl:min-h-0 xl:grid-cols-2">
          <DashboardSection title="Мои курсы" bordered scrollable>
            {isPending ? (
              <SectionPlaceholder>Загружаем список курсов…</SectionPlaceholder>
            ) : courses.length > 0 ? (
              <div className="grid gap-4">
                {courses.map((course) => (
                  <CourseCard
                    key={course.courseId}
                    {...course}
                    className="min-h-full w-full shadow-xs"
                  />
                ))}
              </div>
            ) : (
              <SectionPlaceholder>
                Вы пока не состоите ни в одном курсе. Когда курсы появятся, они
                отобразятся здесь.
              </SectionPlaceholder>
            )}
          </DashboardSection>

          <DeadlinesCalendar className="h-[720px] w-full xl:h-full xl:min-h-0" />
        </div>
      </div>
    </main>
  );
}

type DashboardSectionProps = {
  title: string;
  children: ReactNode;
  contentClassName?: string;
  bordered?: boolean;
  scrollable?: boolean;
};

function DashboardSection({
  title,
  children,
  contentClassName,
  bordered = false,
  scrollable = false,
}: DashboardSectionProps) {
  return (
    <section
      className={[
        'relative flex w-full flex-col overflow-hidden rounded-[2rem] bg-background xl:min-h-0',
        bordered ? 'border border-border/70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'z-10 border-b border-border/70 px-6 py-5 md:px-7',
          'bg-background/70 backdrop-blur-2xl supports-backdrop-filter:bg-background/45',
          scrollable ? 'absolute inset-x-0 top-0' : 'sticky top-0 shrink-0',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>

      <div
        className={[
          'p-4 md:p-5 xl:flex-1 xl:min-h-0',
          scrollable ? 'pt-24 md:pt-[100px] xl:overflow-auto' : '',
          contentClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </section>
  );
}

function SectionPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/30 px-6 py-10 text-center text-sm leading-6 text-muted-foreground">
      <p className="max-w-md">{children}</p>
    </div>
  );
}
