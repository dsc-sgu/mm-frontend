import {
  Moon,
  Sun,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  GitPullRequest,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shadcn/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shadcn/components/ui/dropdown-menu';
import { Link, useMatches, useRouterState } from '@tanstack/react-router';
import { skipToken, useQuery } from '@tanstack/react-query';
import { sessionOptions } from '@/features/auth/api/queries';
import { useLogOut } from '@/features/auth/hooks/use-log-out';
import type { Session } from '@/features/auth/model/types';
import type { LoadCourseResult } from '@/features/course/features/access/api/load-course';
import { courseContextKeys } from '@/features/course/features/access/api/queries';
import { HeaderBreadcrumbs } from '@/app/header/ui/breadcrumbs';
import { HeaderSectionNav } from '@/app/header/ui/section-nav';
import { getHeaderState } from '@/app/header/model/state';
import { cn } from '@/shadcn/lib/utils';

export function Header() {
  const matches = useMatches();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: sessionData } = useQuery(sessionOptions);
  const courseMatch = matches.find(
    (match) => match.routeId === '/_authenticated/courses/$courseSlug'
  );
  const courseContext = courseMatch?.context;
  const { data: lookup, isError: lookupFailed } = useQuery<LoadCourseResult>({
    queryKey:
      courseContext?.course && sessionData?.status === 'authorized'
        ? courseContextKeys.bySlug(
            sessionData.session.userId,
            courseContext.courseSlug
          )
        : courseContextKeys.all,
    queryFn: skipToken,
  });
  const confirmed =
    courseContext?.course &&
    sessionData?.status === 'authorized' &&
    courseContext.session.userId === sessionData.session.userId &&
    !lookupFailed &&
    lookup?.status === 'found' &&
    (pathname === `/courses/${courseContext.courseSlug}` ||
      pathname.startsWith(`/courses/${courseContext.courseSlug}/`));
  // Background lookup updates must reach breadcrumbs even before a route
  // transition replaces its original beforeLoad context.
  const headerMatches =
    confirmed && lookup?.status === 'found'
      ? matches.map((match) =>
          match.routeId === '/_authenticated/courses/$courseSlug'
            ? {
                ...match,
                context: { ...match.context, course: lookup.course },
              }
            : match
        )
      : matches;
  const { breadcrumbs, navItems } =
    courseMatch && !confirmed
      ? { breadcrumbs: [], navItems: [] }
      : getHeaderState(headerMatches);
  const logOut = useLogOut();

  return (
    <header
      className={cn(
        'w-full border-b bg-background/80 backdrop-blur',
        'supports-[backdrop-filter]:bg-background/60'
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center justify-between gap-3 px-3 md:px-4'
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Logo />
          {breadcrumbs.length > 0 && <HeaderDivider />}
          <HeaderBreadcrumbs items={breadcrumbs} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ToggleThemeBtn />
          {sessionData?.status === 'authorized' && (
            <AuthorizedPart session={sessionData.session} onLogOut={logOut} />
          )}
        </div>
      </div>

      <HeaderSectionNav items={navItems} />
    </header>
  );
}

function Logo() {
  return (
    <Link
      to="/"
      aria-label="На главную"
      className={cn(
        'flex shrink-0 items-center rounded-md px-2 py-1 text-lg',
        'font-semibold tracking-tight text-foreground underline-offset-4',
        'hover:underline focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:outline-none'
      )}
    >
      <GitPullRequest className="mr-2 h-5 w-5" />
      MergeMinds
    </Link>
  );
}

function HeaderDivider() {
  return <div className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

function ToggleThemeBtn() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Переключить тему"
      title="Переключить тему"
      onClick={() => {
        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
          localStorage.setItem('theme', 'dark');
        } else {
          localStorage.setItem('theme', 'light');
        }
      }}
    >
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </Button>
  );
}

function AuthorizedPart({
  session,
  onLogOut,
}: {
  session: Session;
  onLogOut: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {}}
        aria-label="Сообщения"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {}}
        aria-label="Уведомления"
      >
        <Bell className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.avatarURL} alt={session.username} />
              <AvatarFallback className="text-xs">
                {sessionNameAbbreviation(session)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-sm leading-none font-medium">
              {sessionFullName(session)}
            </span>
            <span className="text-xs text-muted-foreground">
              @{session.username}
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => console.log('settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Настройки
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onLogOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Выход
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function sessionFullName({ firstName, lastName, patronymic }: Session) {
  return [firstName, lastName, patronymic].filter(Boolean).join(' ');
}

function sessionNameAbbreviation({ firstName, lastName }: Session) {
  return lastName[0] + firstName[0];
}
