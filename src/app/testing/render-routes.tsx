import { StrictMode } from 'react';
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
import { routeTree as appRouteTree } from '@/routeTree.gen';

export type TestRoute = {
  path: string;
  component: RouteComponent;
  beforeLoad?: (queryClient: QueryClient) => Promise<unknown>;
};

export type RenderRoutesOptions = {
  /** Rendered above the routes and kept across navigation, like the header. */
  layout?: RouteComponent;
  /** Use the application's real routes, including its Header and auth loaders. */
  appRoutes?: boolean;
};

/**
 * Renders flat routes, or the real app tree with `appRoutes`, using a fresh
 * Router and QueryClient. Both roots show toasts, including accidental ones.
 */
export function renderRoutes(
  routes: TestRoute[],
  initialPath: string,
  { layout: Layout, appRoutes = false }: RenderRoutesOptions = {}
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
    routeTree: appRoutes ? appRouteTree : routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    defaultErrorComponent: RouteError,
  });

  const app = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  render(appRoutes ? <StrictMode>{app}</StrictMode> : app);

  return { queryClient, router };
}
