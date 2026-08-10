import type { Session } from '@/features/auth/model/schema';
import type { FetchSessionResponse } from '@/features/auth/model/types';

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

export async function fetchSession(): Promise<FetchSessionResponse> {
  return { status: 'AUTHORIZED', session: MOCK_SESSION };
}

export async function login(): Promise<void> {}

export async function register(): Promise<void> {}

export async function logout(): Promise<void> {}
