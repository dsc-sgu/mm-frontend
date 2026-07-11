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

export function areCoursePageBlockTargetPathsEqual(first: Path, second: Path) {
  return (
    first.length === second.length &&
    first.every((segment, index) => segment === second[index])
  );
}

export function isCoursePageBlockTargetEqual(
  first: CoursePageBlockTarget,
  second: CoursePageBlockTarget
) {
  if (first.source === 'id' && second.source === 'id') {
    return first.id === second.id;
  }

  return areCoursePageBlockTargetPathsEqual(first.path, second.path);
}
