import type { HttpResponseResolver } from 'msw';

/** Wraps a resolver to count the requests it answers. */
export function countRequests(resolver: HttpResponseResolver) {
  const counter = {
    count: 0,
    resolver: ((info) => {
      counter.count += 1;
      return resolver(info);
    }) satisfies HttpResponseResolver,
  };
  return counter;
}
