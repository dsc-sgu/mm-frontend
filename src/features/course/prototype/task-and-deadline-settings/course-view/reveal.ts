// PROTOTYPE (#181): keep the chosen Task Reference visible.
/** Scrolls a Task Reference into view only when it is not visible. */
export function revealTaskReference(taskId: string | null, focus = false) {
  if (!taskId) {
    return;
  }

  requestAnimationFrame(() => {
    const element = document.getElementById(`task-ref-${taskId}`);

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.top < 64 || rect.top > window.innerHeight - 120) {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    if (focus) {
      element.querySelector('button')?.focus({ preventScroll: true });
    }
  });
}
