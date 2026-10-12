import { MutationObserver } from '@tanstack/react-query';
import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { countRequests } from '@/app/testing/count-requests';
import {
  jsonBody,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { createQueryClient } from '@/app/remote-data/query-client';

const PROBE_URL = '/api/test/probe';

function probe(init: RequestInit = {}) {
  return runHttpOperation(
    { name: 'probe', url: PROBE_URL, ...init },
    async (context) => {
      throw unexpectedHttpStatus(context);
    }
  );
}

describe('TR-04: QueryClient defaults', () => {
  test('a query without its own retry policy is attempted once', async () => {
    const requests = countRequests(undeclaredStatus(500));
    server.use(http.get(PROBE_URL, requests.resolver));
    const queryClient = createQueryClient();

    await expect(
      queryClient.query({
        queryKey: ['probe'],
        queryFn: ({ signal }) => probe({ signal }),
      })
    ).rejects.toMatchObject({ kind: 'unexpected-http' });
    expect(requests.count).toBe(1);
  });

  test('a mutation is attempted once', async () => {
    const requests = countRequests(undeclaredStatus(500));
    server.use(http.post(PROBE_URL, requests.resolver));
    const mutation = new MutationObserver(createQueryClient(), {
      mutationFn: () => probe({ method: 'POST', ...jsonBody({}) }),
    });

    await expect(mutation.mutate()).rejects.toMatchObject({
      kind: 'unexpected-http',
    });
    expect(requests.count).toBe(1);
  });
});
