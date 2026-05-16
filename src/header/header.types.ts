import type { ReactNode } from 'react';
import type {
  MakeRouteMatchUnion,
  RegisteredRouter,
} from '@tanstack/react-router';
import '@tanstack/router-core';

export type HeaderLinkTarget = {
  to: string;
  params?: Record<string, string | number | undefined>;
};

export type HeaderBreadcrumbItem = {
  label: string;
} & Partial<HeaderLinkTarget>;

export type HeaderNavItem = HeaderLinkTarget & {
  label: string;
  exact?: boolean;
  icon?: ReactNode;
};

export type HeaderRouteMatch = MakeRouteMatchUnion<RegisteredRouter>;

export type HeaderDataContext = {
  matches: HeaderRouteMatch[];
  match: HeaderRouteMatch;
  currentMatch: HeaderRouteMatch;
};

export type HeaderDataGetter<T> = (context: HeaderDataContext) => T;

export type HeaderStaticData = {
  getBreadcrumb?:
    | HeaderBreadcrumbItem[]
    | HeaderDataGetter<HeaderBreadcrumbItem[]>;
  getNavItems?: HeaderNavItem[] | HeaderDataGetter<HeaderNavItem[]>;
};

export type ResolvedHeaderData = {
  breadcrumbs: HeaderBreadcrumbItem[];
  navItems: HeaderNavItem[];
};

declare module '@tanstack/router-core' {
  interface StaticDataRouteOption {
    header?: HeaderStaticData;
  }
}
