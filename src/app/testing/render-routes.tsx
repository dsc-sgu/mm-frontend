import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type RouteComponent,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { createQueryClient } from '@/app/remote-data/query-client';
import { RouteError } from '@/app/route-error';
import { Toaster } from '@/shadcn/components/ui/sonner';

export type TestRoute = {
  path: string;
  component: RouteComponent;
  beforeLoad?: (queryClient: QueryClient) => Promise<unknown>;
};

export type RenderRoutesOptions = {
  /** Rendered above the routes and kept across navigation, like the header. */
  layout?: RouteComponent;
};

/**
 * Renders flat routes with a fresh Router and QueryClient. Like the app root,
 * the root route shows toasts, so a toast shown by mistake is visible.
 */
export function renderRoutes(
  routes: TestRoute[],
  initialPath: string,
  { layout: Layout }: RenderRoutesOptions = {}
) {
  const queryClient = createQueryClient();
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: () => (
      <>
        {Layout && <Layout />}
        <Outlet />
        <Toaster />
      </>
    ),
  });
  const routeTree = rootRoute.addChildren(
    routes.map(({ path, component, beforeLoad }) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component,
        beforeLoad:
          beforeLoad && (({ context }) => beforeLoad(context.queryClient)),
      })
    )
  );
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    defaultErrorComponent: RouteError,
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return { queryClient, router };
}
