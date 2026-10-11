import { createFileRoute } from '@tanstack/react-router';
import { cn } from '@/shadcn/lib/utils';
import { RegistrationForm } from '@/features/auth/ui/registration-form';

export const Route = createFileRoute('/_auth/register')({
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
      <RegistrationForm />
    </div>
  );
}
