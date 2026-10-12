import { HttpResponse, type HttpResponseResolver } from 'msw';

/** Answers with `status`, and with `body` as JSON when it is given. */
export function reply(status: number, body?: unknown): HttpResponseResolver {
  return () =>
    body === undefined
      ? new HttpResponse(null, { status })
      : HttpResponse.json(body, { status });
}
