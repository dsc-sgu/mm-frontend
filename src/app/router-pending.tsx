import { useRouterState } from '@tanstack/react-router';
import { useDebounce } from 'use-debounce';

import styles from './router-pending.module.css';

const LOADER_SHOW_DELAY = 200;
const LOADER_HIDE_DELAY = 600;

export function RouterPending() {
  const isLoading = useRouterState({
    select: (state) => state.isLoading,
  });
  const [debouncedIsLoading] = useDebounce(
    isLoading,
    isLoading ? LOADER_SHOW_DELAY : LOADER_HIDE_DELAY
  );

  if (!debouncedIsLoading) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/10"
      role="status"
      aria-label="Загрузка страницы"
    >
      <div className={styles.bar} />
    </div>
  );
}
