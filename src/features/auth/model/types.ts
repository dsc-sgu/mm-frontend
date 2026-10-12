import type { UserId, Username } from './identity';

export type Session = {
  userId: UserId;
  username: Username;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  avatarURL: string;
  // TODO: Remove with course-local roles (ACC1).
  role: string;
  sessionExpiresAt: string;
};
