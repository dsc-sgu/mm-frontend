import { useRouterState } from '@tanstack/react-router';
import { useIsFetching } from '@tanstack/react-query';
import { courseContextKeys } from '@/features/course/features/access/api/queries';
import { useDebounce } from 'use-debounce';

import styles from './router-pending.module.css';

const LOADER_SHOW_DELAY = 200;
const LOADER_HIDE_DELAY = 600;

export function RouterPending() {
  const isRouterLoading = useRouterState({
    select: (state) => state.isLoading,
  });
  const courseChecks = useIsFetching({ queryKey: courseContextKeys.all });
  const isLoading = isRouterLoading || courseChecks > 0;
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
