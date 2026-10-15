/**
 * Links opt in with `preload="intent"`. TanStack Query decides freshness, so
 * the router keeps no loader cache of its own and reruns the loader on every
 * preload and navigation. The delay skips links the pointer only crosses.
 */
export const routerPreloadOptions = {
  defaultPreloadDelay: 100,
  defaultPreloadStaleTime: 0,
} as const;
