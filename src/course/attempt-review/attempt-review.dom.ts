export function fileElementId(path: string): string {
  return `attempt-review-file-${hashDomIdPart(path)}`;
}

function hashDomIdPart(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return `${value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')}-${(hash >>> 0).toString(36)}`;
}
