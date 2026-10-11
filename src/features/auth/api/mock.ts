import { http, HttpResponse } from 'msw';
import * as v from 'valibot';
import {
  mockBackend,
  mockUserId,
  SESSION_EXPIRES_AT,
  type MockUser,
} from '@/app/mock-backend/state';

// MSW handlers for the auth endpoints of mm-backend@ddd9849
// (internal/auth/users/handler.go): same URLs, statuses and payloads.

const LoginBodySchema = v.object({
  email: v.string(),
  password: v.string(),
});

const RegisterBodySchema = v.object({
  firstName: v.string(),
  lastName: v.string(),
  patronymic: v.string(),
  username: v.string(),
  email: v.string(),
  password: v.string(),
});

export const authHandlers = [
  http.get('/api/v1/auth/session', () => {
    const { session, users } = mockBackend.state;
    const user = session && users.find(({ id }) => id === session.userId);
    if (!session || !user) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      // mm-backend@ddd9849 does not return the user id from this endpoint yet.
      userID: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      patronymic: user.patronymic,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarURL: user.avatarURL,
      sessionExpiresAt: session.expiresAt,
    });
  }),

  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = v.safeParse(LoginBodySchema, await request.json());
    if (!body.success) {
      return new HttpResponse(null, { status: 422 });
    }

    const user = mockBackend.state.users.find(
      ({ email, password }) =>
        email === body.output.email && password === body.output.password
    );
    if (!user) {
      return new HttpResponse(null, { status: 400 });
    }

    mockBackend.state.session = {
      userId: user.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    return HttpResponse.json({
      sessionID: user.id.replace('-8000-', '-9000-'),
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: SESSION_EXPIRES_AT,
      userID: user.id,
    });
  }),

  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = v.safeParse(RegisterBodySchema, await request.json());
    if (!body.success) {
      return new HttpResponse(null, { status: 422 });
    }

    const state = mockBackend.state;
    const isTaken = state.users.some(
      ({ email, username }) =>
        email === body.output.email || username === body.output.username
    );
    // The backend reports every failed insert, duplicates included, as 500.
    if (isTaken) {
      return new HttpResponse(null, { status: 500 });
    }

    const user: MockUser = {
      ...body.output,
      id: mockUserId(state.nextUserNumber),
      role: 'student',
      avatarURL: '',
    };
    state.users.push(user);
    state.nextUserNumber += 1;
    return HttpResponse.json({ id: user.id }, { status: 201 });
  }),

  http.post('/api/v1/auth/logout', () => {
    if (!mockBackend.state.session) {
      return new HttpResponse(null, { status: 401 });
    }

    mockBackend.state.session = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
