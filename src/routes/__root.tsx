import { Header } from '@/app/header/ui/header';
import { CourseContextLoading } from '@/features/course/features/access/ui/route-state';
import { RouterPending } from '@/app/router-pending';
// PROTOTYPE: the prototype bar, in dev and prototype demo builds.
import { PrototypeBar } from '@/app/prototypes/bar';
import { PROTOTYPES_ENABLED } from '@/app/prototypes/enabled';
import { Toaster } from '@/shadcn/components/ui/sonner';
import type { QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  useMatches,
} from '@tanstack/react-router';

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: CourseContextLoading,
});

function RootComponent() {
  const matches = useMatches();
  const authLayout = matches.find(
    (match) => match.routeId === '/_authenticated' || match.routeId === '/_auth'
  );
  // A Header observer must not own an unconfirmed session request: its
  // StrictMode teardown would cancel the request awaited by beforeLoad.
  const showHeader =
    !authLayout ||
    authLayout.status === 'success' ||
    ('session' in authLayout.context && Boolean(authLayout.context.session));
  return (
    <>
      <RouterPending />
      {showHeader && <Header />}
      <Outlet />
      <Toaster position="top-right" />
      {PROTOTYPES_ENABLED && showHeader ? <PrototypeBar /> : null}
    </>
  );
}
