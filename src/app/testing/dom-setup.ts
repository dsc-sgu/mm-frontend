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

afterEach(() => {
  cleanup();
  // Toasts live in a module-level store, and a new Toaster replays the active ones.
  toast.dismiss();
});
