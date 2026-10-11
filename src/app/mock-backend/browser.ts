import { setupWorker } from 'msw/browser';
import { handlers } from '@/app/mock-backend/handlers';

export async function startMockBackend() {
  await setupWorker(...handlers).start({ onUnhandledRequest: 'bypass' });
}
