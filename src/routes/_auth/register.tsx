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
import { useRegisterMutation } from '@/auth/auth.queries';
import {
  registrationSchema,
  type RegistrationFormData,
} from '@/auth/auth.schemes';

export const Route = createFileRoute('/_auth/register')({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: valibotResolver(registrationSchema),
  });

  const navigate = useNavigate();
  const { mutateAsync: registerMut } = useRegisterMutation();

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      const { confirmPassword: _, ...restData } = data;
      await registerMut(restData);
      navigate({ to: '/login' });
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <div
      className={cn(
        'min-h-[calc(100vh-4rem)] flex items-center justify-center bg-linear-to-br',
        'from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4'
      )}
    >
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Регистрация
          </CardTitle>
          <CardDescription className="text-center">
            Заполните форму для создания аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Фамилия <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="Иванов"
                  {...register('lastName')}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Имя <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="Иван"
                  {...register('firstName')}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">Отчество</Label>
              <Input
                id="middleName"
                placeholder="Иванович"
                {...register('patronymic')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">
                Имя пользователя <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                placeholder="ivan_ivanov"
                {...register('username')}
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ivan@example.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Пароль <span className="text-red-500">*</span>
                </Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Подтверждение пароля <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Уже есть аккаунт?{' '}
              </span>
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Войти
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
