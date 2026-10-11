export type Session = {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  avatarURL: string;
  // TODO: Remove with course-local roles (ACC1).
  role: string;
  sessionExpiresAt: string;
};
