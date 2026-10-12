import { setupWorker } from 'msw/browser';
import { handlers } from '@/app/mock-backend/handlers';

export async function startMockBackend() {
  const worker = setupWorker(...handlers);
  if (import.meta.env.DEV && import.meta.env.MODE === 'e2e') {
    // Static imports would put the test control channel in the normal dev graph.
    const { installTestControl } = await import('./test-control');
    installTestControl(worker);
  }
  await worker.start({ onUnhandledRequest: 'bypass' });
}
