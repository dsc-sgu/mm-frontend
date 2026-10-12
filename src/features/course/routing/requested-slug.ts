import { useRouter, useRouterState } from '@tanstack/react-router';

/** Match the requested URL, not the previously committed Course shell. */
export function useRequestedCourseSlug() {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [routes, params] = router.getMatchedRoutes(pathname);
  return routes.some(
    (route) => route.id === '/_authenticated/courses/$courseSlug'
  )
    ? params.courseSlug
    : undefined;
}
