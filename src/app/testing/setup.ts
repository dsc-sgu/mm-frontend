import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from '@/app/mock-backend/node';
import { mockBackend } from '@/app/mock-backend/state';

// Operations call same-origin relative URLs. jsdom resolves them against its
// location; the Node environment gets the same origin.
if (typeof location === 'undefined') {
  vi.stubGlobal('location', new URL('http://localhost:3000/'));
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  mockBackend.reset();
});

afterAll(() => server.close());
