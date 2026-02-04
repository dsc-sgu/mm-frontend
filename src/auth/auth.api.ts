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
