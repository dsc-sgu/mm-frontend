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
import { useLoginMutation } from '@/features/auth/api/queries';
import { loginSchema, type LoginFormData } from '@/features/auth/model/schema';
import { authFailureText } from '@/features/auth/ui/failure-text';

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: valibotResolver(loginSchema),
  });

  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const onSubmit = (data: LoginFormData) => {
    // Callbacks passed to `mutate` run only while the form is mounted, so a
    // request that settles after the user has left changes nothing on screen.
    loginMutation.mutate(data, {
      onSuccess: async (outcome) => {
        if (outcome.status === 'signed-in') {
          // TODO: Return to previous page
          await navigate({ to: '/' });
        }
      },
    });
  };

  const submitError =
    loginMutation.data?.status === 'invalid-credentials'
      ? 'Неверный email или пароль'
      : loginMutation.error && authFailureText('login', loginMutation.error);

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">
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
              <p className="text-sm text-destructive">{errors.email.message}</p>
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

          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Вход...' : 'Войти'}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Нет аккаунта?</span>{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              Зарегистрироваться
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
