import { SessionScheme, type Session } from './auth.schemes';
import axios from 'axios';
import * as v from 'valibot';

// TODO: Use VITE_BASE_API_URL env

export type FetchSessionResponse =
  | { status: 'AUTHORIZED'; session: Session }
  | { status: 'NOT_AUTHORIZED' };

export async function fetchSession(): Promise<FetchSessionResponse> {
  try {
    const response = await axios.get('/api/v1/auth/session', {
      withCredentials: true,
    });
    return {
      status: 'AUTHORIZED',
      session: v.parse(SessionScheme, response.data),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { status: 'NOT_AUTHORIZED' };
    }
    throw error;
  }
}

// TODO: Handle errors
export async function login(req: { email: string; password: string }) {
  return await axios.post('/api/v1/auth/login', req, { withCredentials: true });
}

// TODO: Handle errors
export async function register(req: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  patronymic?: string;
  username: string;
}) {
  return await axios.post('/api/v1/auth/register', req);
}

// TODO: Handle errors
export async function logout() {
  await axios.post('/api/v1/auth/logout', {}, { withCredentials: true });
}
