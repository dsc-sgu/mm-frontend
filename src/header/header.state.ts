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

  const headerSegments: Array<{
    breadcrumbs: HeaderBreadcrumbItem[];
    navItems: HeaderNavItem[] | 'inherit';
  }> = matches.map((match) => {
    const context: HeaderDataContext = { matches, match, currentMatch };
    const headerData = match.staticData?.header;

    return {
      breadcrumbs: resolveHeaderValue(headerData?.getBreadcrumb ?? [], context),
      navItems: headerData?.getNavItems
        ? resolveHeaderValue(headerData.getNavItems, context)
        : 'inherit',
    };
  });

  return {
    breadcrumbs: headerSegments.flatMap(({ breadcrumbs }) => breadcrumbs),
    navItems: headerSegments.reduce<HeaderNavItem[]>(
      (navItems, { navItems: nextNavItems }) =>
        nextNavItems === 'inherit' ? navItems : nextNavItems,
      []
    ),
  };
}

function resolveHeaderValue<T>(
  value: T[] | HeaderDataGetter<T[]>,
  context: HeaderDataContext
): T[] {
  return typeof value === 'function' ? value(context) : value;
}
