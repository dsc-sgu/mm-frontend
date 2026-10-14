import { cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, vi } from 'vitest';

// jsdom has no layout; the router restores scroll positions on navigation.
window.scrollTo = () => {};

// jsdom has no layout changes to observe. The real app's Toaster subscribes to
// ResizeObserver even when a Course contract does not render a toast.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

// jsdom has no media queries. Width queries match its fixed 1024px viewport,
// so the Attempt page uses its desktop layout; any other query never matches.
function matchesWidth(query: string): boolean {
  const width = /^\((min|max)-width:\s*(\d+)px\)$/.exec(query);
  if (!width) return false;
  const limit = Number(width[2]);
  return width[1] === 'min'
    ? window.innerWidth >= limit
    : window.innerWidth <= limit;
}

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: matchesWidth(query),
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
}));

afterEach(() => {
  cleanup();
  // Toasts live in a module-level store, and a new Toaster replays the active ones.
  toast.dismiss();
});
