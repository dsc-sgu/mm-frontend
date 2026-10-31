import { useEffect } from 'react';
import {
  useActivePrototypeStore,
  usePrototypeActive,
} from '@/app/prototypes/active';
import { PROTOTYPES_ENABLED } from '@/app/prototypes/enabled';
import { CreateCoursePrototype } from '@/features/course/prototype/create-course/ui';
import { CourseCard, CourseCardSkeleton } from '@/features/course/ui/card';
import { useCoursesQuery } from '@/features/course/api/queries';
import { coursesFailureText } from '@/features/course/ui/failure-text';
import { Button } from '@/shadcn/components/ui/button';
import { DeadlinesCalendar } from '@/features/deadlines-calendar/calendar';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cn } from '@/shadcn/lib/utils';

export const Route = createFileRoute('/_authenticated/')({
  validateSearch: (search: Record<string, unknown>): { variant?: string } => ({
    ...(typeof search.variant === 'string' ? { variant: search.variant } : {}),
  }),
  staticData: {
    header: {
      getBreadcrumb: [{ label: 'Панель управления' }],
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { variant } = Route.useSearch();
  const prototypeActive = usePrototypeActive('create-course');
  const setActive = useActivePrototypeStore((state) => state.setActive);
  const requestedPrototype =
    PROTOTYPES_ENABLED &&
    ['A', 'B', 'C', 'D', 'E', 'F'].includes(variant ?? '');
  const creationActive = prototypeActive || requestedPrototype;
  useEffect(() => {
    if (requestedPrototype) setActive('create-course');
  }, [requestedPrototype, setActive]);
  const {
    data: courses = [],
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useCoursesQuery(session.userId);

  function renderCourses(emptyState?: ReactNode) {
    if (isPending) {
      return <CourseListSkeleton />;
    }
    if (isError) {
      return (
        <div role="alert" className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {coursesFailureText(error)}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            Повторить
          </Button>
        </div>
      );
    }
    if (courses.length === 0) {
      if (emptyState) return emptyState;
      return (
        <SectionPlaceholder>
          Вы пока не состоите ни в одном курсе. Когда курсы появятся, они
          отобразятся здесь.
        </SectionPlaceholder>
      );
    }
    return (
      <div className="grid gap-4">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            {...course}
            className="min-h-full w-full shadow-xs"
          />
        ))}
      </div>
    );
  }

  function renderDashboard(controls?: {
    trigger: ReactNode;
    emptyState: ReactNode;
  }) {
    return (
      <main
        className={cn(
          'min-h-[calc(100vh-3.5rem)] bg-muted/30 xl:h-[calc(100vh-3.5rem)]',
          'xl:overflow-hidden'
        )}
      >
        <div className="box-border h-full px-4 py-6 md:px-6 lg:px-8">
          <div className="grid w-full gap-6 xl:h-full xl:min-h-0 xl:grid-cols-2">
            <DashboardSection
              title="Мои курсы"
              action={controls?.trigger}
              bordered
              scrollable
            >
              {renderCourses(controls?.emptyState)}
            </DashboardSection>

            <DeadlinesCalendar
              className={cn('h-[720px] w-full', 'xl:h-full xl:min-h-0')}
            />
          </div>
        </div>
      </main>
    );
  }
  if (creationActive) {
    return <CreateCoursePrototype>{renderDashboard}</CreateCoursePrototype>;
  }
  return renderDashboard();
}

type DashboardSectionProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  bordered?: boolean;
  scrollable?: boolean;
};

function DashboardSection({
  title,
  action,
  children,
  contentClassName,
  bordered = false,
  scrollable = false,
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-[2rem] bg-background xl:min-h-0',
        bordered && 'border border-border/70'
      )}
    >
      <div
        className={cn(
          'z-10 flex items-center justify-between gap-3 border-b border-border/70 px-6 py-5 md:px-7',
          'bg-background/70 backdrop-blur-2xl supports-backdrop-filter:bg-background/45',
          scrollable ? 'absolute inset-x-0 top-0' : 'sticky top-0 shrink-0'
        )}
      >
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {action}
      </div>

      <div
        className={cn(
          'p-4 md:p-5 xl:min-h-0 xl:flex-1',
          scrollable && 'pt-24 md:pt-[100px] xl:overflow-auto',
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}

const COURSE_SKELETON_COUNT = 4;

function CourseListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Загружаем список курсов"
      className="grid gap-4"
    >
      <span className="sr-only">Загружаем список курсов…</span>
      {Array.from({ length: COURSE_SKELETON_COUNT }).map((_, index) => (
        <CourseCardSkeleton key={index} className="min-h-full w-full" />
      ))}
    </div>
  );
}

function SectionPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex min-h-48 items-center justify-center rounded-3xl border',
        'border-dashed border-border/80 bg-muted/30 px-6 py-10 text-center',
        'text-sm leading-6 text-muted-foreground'
      )}
    >
      <p className="max-w-md">{children}</p>
    </div>
  );
}
