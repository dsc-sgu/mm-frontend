import { setupServer } from 'msw/node';
import { handlers } from '@/app/mock-backend/handlers';

export const server = setupServer(...handlers);
