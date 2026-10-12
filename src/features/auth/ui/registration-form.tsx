import { Link, useNavigate } from '@tanstack/react-router';
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
import { useRegisterMutation } from '@/features/auth/api/queries';
import {
  registrationSchema,
  type RegistrationFormData,
} from '@/features/auth/model/schema';
import { authFailureText } from '@/features/auth/ui/failure-text';
import type { InferInput } from 'valibot';

export function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    InferInput<typeof registrationSchema>,
    unknown,
    RegistrationFormData
  >({
    resolver: valibotResolver(registrationSchema),
  });

  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();

  const onSubmit = (data: RegistrationFormData) => {
    // Callbacks passed to `mutate` run only while the form is mounted.
    registerMutation.mutate(
      {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        patronymic: data.patronymic ?? '',
        username: data.username,
      },
      { onSuccess: () => navigate({ to: '/login' }) }
    );
  };

  const submitError =
    registerMutation.error &&
    authFailureText('register', registerMutation.error);

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">
          Регистрация
        </CardTitle>
        <CardDescription className="text-center">
          Заполните форму для создания аккаунта
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Фамилия <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Иванов"
                {...register('lastName')}
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">
                Имя <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="Иван"
                {...register('firstName')}
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">
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
              Имя пользователя <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              placeholder="ivan_ivanov"
              {...register('username')}
              className={errors.username ? 'border-destructive' : ''}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="ivan@example.com"
              {...register('email')}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">
                Пароль <span className="text-destructive">*</span>
              </Label>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Подтверждение пароля <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending
              ? 'Регистрация...'
              : 'Зарегистрироваться'}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Уже есть аккаунт?</span>{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Войти
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
