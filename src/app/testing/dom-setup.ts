import { cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach } from 'vitest';

// jsdom has no layout; the router restores scroll positions on navigation.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  // Toasts live in a module-level store, and a new Toaster replays the active ones.
  toast.dismiss();
});
