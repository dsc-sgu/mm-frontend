import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { routeTree } from './routeTree.gen.ts';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

declare global {
  // Global augmentation intentionally uses interface declaration merging.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import('@tanstack/query-core').QueryClient;
  }
}

window.__TANSTACK_QUERY_CLIENT__ = queryClient;

const router = createRouter({ routeTree, context: { queryClient } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
