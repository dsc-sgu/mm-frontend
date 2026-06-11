import type { Session } from './auth.schemas';

export type FetchSessionResponse =
  | { status: 'AUTHORIZED'; session: Session }
  | { status: 'NOT_AUTHORIZED' };

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  patronymic?: string;
  username: string;
};
