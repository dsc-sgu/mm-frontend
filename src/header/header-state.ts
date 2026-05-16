import type {
  HeaderBreadcrumbItem,
  HeaderDataContext,
  HeaderDataGetter,
  HeaderNavItem,
  HeaderRouteMatch,
  HeaderState,
} from './header.types';

export function getHeaderState(
  matches: readonly HeaderRouteMatch[]
): HeaderState {
  const currentMatch = matches.at(-1);

  if (!currentMatch) {
    return { breadcrumbs: [], navItems: [] };
  }

  const breadcrumbs: HeaderBreadcrumbItem[] = [];
  let navItems: HeaderNavItem[] = [];
  const headerMatches = [...matches];

  for (const match of headerMatches) {
    const context: HeaderDataContext = {
      matches: headerMatches,
      match,
      currentMatch,
    };
    const header = match.staticData?.header;

    if (header?.getBreadcrumb) {
      breadcrumbs.push(...resolveHeaderValue(header.getBreadcrumb, context));
    }

    if (header?.getNavItems) {
      navItems = resolveHeaderValue(header.getNavItems, context);
    }
  }

  return { breadcrumbs, navItems };
}

function resolveHeaderValue<T>(
  value: T[] | HeaderDataGetter<T[]>,
  context: HeaderDataContext
) {
  return typeof value === 'function' ? value(context) : value;
}
