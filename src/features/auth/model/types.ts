import type { UserId, Username } from './identity';

export type Session = {
  userId: UserId;
  username: Username;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  avatarUrl: string;
  sessionExpiresAt: string;
};
