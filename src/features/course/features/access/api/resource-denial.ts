import type { HttpResponseContext } from '@/app/remote-data/http';

/**
 * A read of a participant-bound resource by stable identities can be denied
 * at any moment after its locator resolved: access is rechecked on every
 * request, so the denial is a declared outcome, not a failure.
 */
export type ResourceDenial = { status: 'forbidden' } | { status: 'not-found' };

// Working contract pending backend confirmation #113: denials carry no body.
export function readResourceDenial(
  context: HttpResponseContext
): ResourceDenial | null {
  switch (context.response.status) {
    case 403:
      return { status: 'forbidden' };
    case 404:
      return { status: 'not-found' };
    default:
      return null;
  }
}

export function isResourceDenial(result: {
  status: string;
}): result is ResourceDenial {
  return result.status === 'forbidden' || result.status === 'not-found';
}
