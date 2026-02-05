import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import * as v from 'valibot';
import { cn } from '@/lib/utils';
import { useLoginMutation } from '@/auth/auth.queries';

export const Route = createFileRoute('/_auth/login')({
  component: RouteComponent,
});

const loginSchema = v.object({
  email: v.pipe(
    v.string('Email обязателен'),
    v.email('Введите корректный email')
  ),
  password: v.string('Пароль обязателен'),
});

export type LoginFormData = v.InferOutput<typeof loginSchema>;

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
        'bg-linear-to-br from-gray-50 to-gray-100',
        'dark:from-gray-900 dark:to-gray-800 p-4'
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
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 dark:text-red-400">
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
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Вход...' : 'Войти'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Нет аккаунта?{' '}
              </span>
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
