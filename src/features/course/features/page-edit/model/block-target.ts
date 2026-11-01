import type { Path } from 'platejs';

export type CoursePageBlockTarget =
  | { source: 'id'; id: string; path: Path }
  | { source: 'path'; path: Path };

export function getCoursePageBlockTargetKey(target: CoursePageBlockTarget) {
  if (target.source === 'id') {
    return `id:${target.id}`;
  }

  return `path:${target.path.join('.')}`;
}
