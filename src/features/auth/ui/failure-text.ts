import { OperationFailure } from '@/app/remote-data/http';

type AuthAction = 'login' | 'register' | 'logout';

const actionText: Record<AuthAction, string> = {
  login: 'Не удалось войти',
  register: 'Не удалось зарегистрироваться',
  logout: 'Не удалось выйти',
};

/**
 * User-facing text for a failed auth operation, chosen by the failure kind.
 * `error.message` is an internal diagnostic and is never shown.
 */
export function authFailureText(action: AuthAction, error: Error) {
  if (error instanceof OperationFailure && error.kind === 'network') {
    return `${actionText[action]}: нет связи с сервером. Проверьте подключение и попробуйте ещё раз.`;
  }

  return `${actionText[action]}: сервер ответил не так, как ожидалось. Попробуйте ещё раз позже.`;
}
