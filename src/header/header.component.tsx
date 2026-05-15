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
import { Link, useMatches } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { SESSION_OPTIONS, useLogoutMutation } from '../auth/auth.queries';
import type { FetchSessionResponse } from '../auth/auth.api';
import { HeaderBreadcrumbs } from './header-breadcrumbs.component';
import { HeaderSectionNav } from './header-section-nav.component';
import { resolveHeaderData } from './header-data.utils';

export function Header() {
  const matches = useMatches();
  const { breadcrumbs, navItems } = resolveHeaderData(matches);
  const { data: sessionData } = useQuery(SESSION_OPTIONS);
  const { mutateAsync: logoutMut } = useLogoutMutation();

  return (
    <header className="w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            to="/"
            aria-label="На главную"
            className="flex shrink-0 items-center rounded-md px-2 py-1 text-lg font-semibold tracking-tight text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GitPullRequest className="mr-2 h-5 w-5" />
            MergeMinds
          </Link>

          {breadcrumbs.length > 0 && (
            <div className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
          )}

          <HeaderBreadcrumbs items={breadcrumbs} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Переключить тему"
            title="Переключить тему"
            onClick={() => {
              document.documentElement.classList.toggle('dark');
            }}
          >
            <Sun className="hidden h-5 w-5 dark:block" />
            <Moon className="h-5 w-5 dark:hidden" />
          </Button>

          {sessionData?.status === 'AUTHORIZED' && (
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
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={sessionData.session.avatarURL}
                        alt={sessionData.session.username}
                      />
                      <AvatarFallback className="text-xs">
                        {sessionNameAbbreviation(sessionData)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm font-medium leading-none">
                      {sessionFullName(sessionData)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{sessionData.session.username}
                    </span>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => console.log('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Настройки
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={async () => await logoutMut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Выход
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <HeaderSectionNav items={navItems} />
    </header>
  );
}

function sessionFullName({
  session: { firstName, lastName, patronymic },
}: Extract<FetchSessionResponse, { status: 'AUTHORIZED' }>) {
  return [firstName, lastName, patronymic].filter(Boolean).join(' ');
}

function sessionNameAbbreviation({
  session: { firstName, lastName },
}: Extract<FetchSessionResponse, { status: 'AUTHORIZED' }>) {
  return lastName[0] + firstName[0];
}
