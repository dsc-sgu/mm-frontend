import { SessionScheme } from './auth.schemes';
import type {
  FetchSessionResponse,
  LoginRequest,
  RegisterRequest,
} from './auth.types';
import * as mockAuthApi from './auth.api.mock';
import axios from 'axios';
import * as v from 'valibot';

// TODO: Use VITE_BASE_API_URL env

export type { FetchSessionResponse } from './auth.types';

const IS_MOCK_AUTH_ENABLED = import.meta.env.VITE_MOCK_AUTH === 'true';

export async function fetchSession(): Promise<FetchSessionResponse> {
  if (IS_MOCK_AUTH_ENABLED) {
    return mockAuthApi.fetchSession();
  }

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
export async function login(req: LoginRequest): Promise<void> {
  if (IS_MOCK_AUTH_ENABLED) {
    return mockAuthApi.login();
  }

  await axios.post('/api/v1/auth/login', req, { withCredentials: true });
}

// TODO: Handle errors
export async function register(req: RegisterRequest): Promise<void> {
  if (IS_MOCK_AUTH_ENABLED) {
    return mockAuthApi.register();
  }

  await axios.post('/api/v1/auth/register', req);
}

// TODO: Handle errors
export async function logout(): Promise<void> {
  if (IS_MOCK_AUTH_ENABLED) {
    return mockAuthApi.logout();
  }

  await axios.post('/api/v1/auth/logout', {}, { withCredentials: true });
}
