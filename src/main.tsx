import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { routeTree } from './routeTree.gen.ts';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '@/app/remote-data/query-client';
import { RouteError } from '@/app/route-error';
import { routerPreloadOptions } from '@/app/router-preload';

const queryClient = createQueryClient();

declare global {
  // Global augmentation intentionally uses interface declaration merging.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

if (import.meta.env.DEV) {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;
}

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultErrorComponent: RouteError,
  ...routerPreloadOptions,
});

// The first render already checks the session, so the worker must be running
// before it. Production builds drop this branch together with MSW.
async function enableMockBackend() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_BACKEND === 'true') {
    const { startMockBackend } = await import('@/app/mock-backend/browser');
    await startMockBackend();
  }
}

// If the worker fails to start, nothing renders: requests must not silently
// reach the real backend while the mock backend is requested.
void enableMockBackend().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
});
