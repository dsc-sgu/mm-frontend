export function fileElementId(path: string): string {
  return `attempt-review-file-${path.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}
