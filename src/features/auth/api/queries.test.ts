import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { networkFailure, undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { countRequests } from '@/app/testing/count-requests';
import { createQueryClient } from '@/app/remote-data/query-client';
import { sessionOptions } from '@/features/auth/api/queries';

const SESSION_URL = '/api/v1/auth/session';

describe('TR-04: session check retry policy', () => {
  test.each([
    ['a network failure', networkFailure, 'network'],
    ['HTTP 503', undeclaredStatus(503), 'unexpected-http-status'],
  ])('%s is retried exactly once', async (_, failure, kind) => {
    const requests = countRequests(failure);
    server.use(http.get(SESSION_URL, requests.resolver));

    await expect(
      createQueryClient().query(sessionOptions)
    ).rejects.toMatchObject({ kind });
    expect(requests.count).toBe(2);
  });

  test('HTTP 500 is not retried', async () => {
    const requests = countRequests(undeclaredStatus(500));
    server.use(http.get(SESSION_URL, requests.resolver));

    await expect(
      createQueryClient().query(sessionOptions)
    ).rejects.toMatchObject({ kind: 'unexpected-http-status' });
    expect(requests.count).toBe(1);
  });
});
