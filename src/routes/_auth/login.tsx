import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { Button } from '@/shadcn/components/ui/button';
import { Input } from '@/shadcn/components/ui/input';
import { Label } from '@/shadcn/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shadcn/components/ui/card';
import { cn } from '@/shadcn/lib/utils';
import { useLoginMutation } from '@/features/auth/api/queries';
import { loginSchema, type LoginFormData } from '@/features/auth/model/schema';

export const Route = createFileRoute('/_auth/login')({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: valibotResolver(loginSchema),
  });

  const navigate = useNavigate();
  const { mutateAsync: loginMut } = useLoginMutation();

  const onSubmit = async (data: LoginFormData) => {
    try {
      // TODO: Return to previous page
      await loginMut(data);
      await navigate({ to: '/' });
    } catch (error) {
      // TODO: Handle errors
      console.error('Login error:', error);
    }
  };

  return (
    <div
      className={cn(
        'min-h-[calc(100vh-4rem)] flex items-center justify-center',
        'bg-linear-to-br from-background via-muted/30 to-muted p-4'
      )}
    >
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Вход в систему
          </CardTitle>
          <CardDescription className="text-center">
            Введите свои учетные данные для входа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Вход...' : 'Войти'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Нет аккаунта?</span>{' '}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                Зарегистрироваться
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
