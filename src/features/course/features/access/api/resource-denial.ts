import type { HttpResponseContext } from '@/app/remote-data/http';

/**
 * A read of a participant-bound resource can be denied at any moment, its
 * locator included: access is rechecked on every request, so the denial is a
 * declared outcome, not a failure. A missing and a foreign resource are one
 * outcome (ADR 0006).
 */
export type ResourceDenial = { status: 'not-found' };

// Working contract pending backend confirmation #113: denials carry no body.
export function readResourceDenial(
  context: HttpResponseContext
): ResourceDenial | null {
  return context.response.status === 404 ? { status: 'not-found' } : null;
}

export function isResourceDenial(result: {
  status: string;
}): result is ResourceDenial {
  return result.status === 'not-found';
}
