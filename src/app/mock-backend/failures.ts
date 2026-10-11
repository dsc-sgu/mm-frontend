import { HttpResponse, type HttpResponseResolver } from 'msw';

// Failure profiles from the test contract matrix («Fixtures» tab). They are
// configured per request with `server.use(...)`, separately from the seed, and
// describe what the operation observes rather than a random delay.

/** `fail:network`: Fetch rejects; the request never reached the server. */
export const networkFailure: HttpResponseResolver = () => HttpResponse.error();

/** `fail:http-500`: a status the operation does not declare. */
export function undeclaredStatus(status = 500): HttpResponseResolver {
  return () => new HttpResponse(null, { status });
}

/** `fail:invalid`: the body cannot be read as JSON. */
export const unreadableBody: HttpResponseResolver = () =>
  new HttpResponse('{"truncated":', {
    headers: { 'content-type': 'application/json' },
  });

/** `fail:invalid`: JSON that violates the operation's schema. */
export function invalidBody(body: unknown, status = 200): HttpResponseResolver {
  return () =>
    new HttpResponse(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
}

export type HeldResponse = {
  /** Waits for `release()`, then falls through to the next matching handler. */
  resolver: HttpResponseResolver;
  /** Settles once the request has reached the handler. */
  requested: Promise<void>;
  release: () => void;
};

/**
 * `fail:held`: the response waits until the test releases it.
 *
 * After release the request falls through, so the next handler decides the
 * outcome: the seeded backend, or a failure profile registered after this one.
 */
export function holdResponse(): HeldResponse {
  let markRequested!: () => void;
  let release!: () => void;
  const requested = new Promise<void>((resolve) => (markRequested = resolve));
  const released = new Promise<void>((resolve) => (release = resolve));

  return {
    resolver: async () => {
      markRequested();
      await released;
    },
    requested,
    release,
  };
}

/**
 * `fail:held` while the body is read: the status and the first bytes arrive,
 * the rest of the body waits forever.
 *
 * A browser errors the body with the abort reason when the request is
 * cancelled. MSW does not tie mocked bodies to the request signal, so the
 * profile takes the signal the operation was started with.
 */
export function holdBody(signal: AbortSignal): HttpResponseResolver {
  return () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"held":'));
        signal.addEventListener('abort', () => controller.error(signal.reason));
      },
    });

    return new HttpResponse(body, {
      headers: { 'content-type': 'application/json' },
    });
  };
}
