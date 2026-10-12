import { OperationFailure } from '@/app/remote-data/http';

/** Operation diagnostics stay in DevTools; the list explains the failure kind. */
export function coursesFailureText(error: Error) {
  if (!(error instanceof OperationFailure)) {
    return 'Не удалось загрузить курсы: произошла непредвиденная ошибка. Попробуйте ещё раз.';
  }

  switch (error.kind) {
    case 'network':
      return 'Не удалось загрузить курсы: нет связи с сервером. Проверьте подключение и попробуйте ещё раз.';
    case 'unexpected-http-status':
      return 'Не удалось загрузить курсы: сервер вернул неожиданный ответ. Попробуйте ещё раз позже.';
    case 'unreadable-body':
      return 'Не удалось загрузить курсы: не удалось прочитать ответ сервера. Попробуйте ещё раз.';
    case 'invalid-response':
      return 'Не удалось загрузить курсы: сервер вернул некорректные данные. Попробуйте ещё раз.';
  }
}
