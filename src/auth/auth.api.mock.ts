import type { Session } from './auth.schemas';
import type { FetchSessionResponse } from './auth.types';

const MOCK_AUTH_STORAGE_KEY = 'mm.mock-auth.authorized';

const MOCK_SESSION: Session = {
  avatarURL: '',
  email: 'mit-teacher@example.com',
  firstName: 'Преподаватель',
  lastName: 'СИТ',
  patronymic: '',
  username: 'mit-teacher',
  role: 'teacher',
  sessionExpiresAt: '2099-12-31T23:59:59.999Z',
};

function getLocalStorage() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage;
}

export async function fetchSession(): Promise<FetchSessionResponse> {
  const storage = getLocalStorage();
  const isAuthorized = storage?.getItem(MOCK_AUTH_STORAGE_KEY) === 'true';

  if (!isAuthorized) {
    return { status: 'NOT_AUTHORIZED' };
  }

  return { status: 'AUTHORIZED', session: MOCK_SESSION };
}

export async function login(): Promise<void> {
  getLocalStorage()?.setItem(MOCK_AUTH_STORAGE_KEY, 'true');
}

export async function register(): Promise<void> {}

export async function logout(): Promise<void> {
  getLocalStorage()?.removeItem(MOCK_AUTH_STORAGE_KEY);
}
