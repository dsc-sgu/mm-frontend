import { createFileRoute } from '@tanstack/react-router';
import { cn } from '@/shadcn/lib/utils';
import { LoginForm } from '@/features/auth/ui/login-form';

export const Route = createFileRoute('/_auth/login')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div
      className={cn(
        'flex min-h-[calc(100vh-4rem)] items-center justify-center',
        'bg-linear-to-br from-background via-muted/30 to-muted p-4'
      )}
    >
      <LoginForm />
    </div>
  );
}
