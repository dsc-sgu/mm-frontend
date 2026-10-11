import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout; the router restores scroll positions on navigation.
window.scrollTo = () => {};

afterEach(cleanup);
