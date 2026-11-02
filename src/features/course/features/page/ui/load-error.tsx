export function CoursePageLoadError({
  onRetry,
}: {
  onRetry: () => Promise<unknown>;
}) {
  return (
    <div role="alert">
      Не удалось загрузить страницу{' '}
      <button
        onClick={() => {
          void onRetry();
        }}
      >
        Повторить
      </button>
    </div>
  );
}
