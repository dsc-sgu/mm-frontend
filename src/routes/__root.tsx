import { Header } from '@/app/header/ui/header';
import { RouterPending } from '@/app/router-pending';
import { Toaster } from '@/shadcn/components/ui/sonner';
import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <RouterPending />
      <Header />
      <Outlet />
      <Toaster position="top-right" />
    </>
  );
}
