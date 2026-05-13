import { Header } from '@/header/header.component';
import { RouterPending } from '@/router-pending.component';
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
    </>
  );
}
