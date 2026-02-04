import {
  Moon,
  Sun,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  GitPullRequest,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@tanstack/react-router';

const MOCK_AUTHED = true;
const mockUser = MOCK_AUTHED
  ? {
      name: 'Кудяков Артём',
      username: 't3m8ch',
      avatarUrl: 'https://lipsum.app/random/500x500',
    }
  : null;

export function Header() {
  const isAuthed = Boolean(mockUser);

  return (
    <header
      className={cn(
        'w-full border-b bg-background/80 backdrop-blur',
        'supports - backdrop - filter: bg - background / 60'
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight flex items-center"
          >
            <GitPullRequest className="mr-2 w-5" />
            MergeMinds
          </Link>
        </div>

        <div className="flex items-center gap-1">
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

          {isAuthed && (
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
                        src={mockUser?.avatarUrl}
                        alt={mockUser?.name ?? 'Пользователь'}
                      />
                      <AvatarFallback className="text-xs">КА</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm font-medium leading-none">
                      {mockUser?.name ?? 'Пользователь'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{mockUser?.username ?? ''}
                    </span>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => console.log('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Настройки
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => console.log('logout')}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Выход
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
