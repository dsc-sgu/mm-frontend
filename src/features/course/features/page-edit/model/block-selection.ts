import type { Path } from 'platejs';

import {
  getCoursePageBlockTargetKey,
  type CoursePageBlockTarget,
} from '@/features/course/features/page-edit/model/block-target';

export type CoursePageBlockSelectionTarget = CoursePageBlockTarget;

export type CoursePageBlockSelectionItem = {
  key: string;
  path: Path;
};

export type CoursePageBlockSelection =
  | { status: 'none' }
  | {
      status: 'selected';
      anchorKey: string;
      items: CoursePageBlockSelectionItem[];
    };

export function createCoursePageBlockSelectionItem(
  target: CoursePageBlockSelectionTarget
): CoursePageBlockSelectionItem {
  return {
    key: getCoursePageBlockTargetKey(target),
    path: target.path,
  };
}

export function isCoursePageBlockSelected(
  selection: CoursePageBlockSelection,
  target: CoursePageBlockSelectionTarget
) {
  if (selection.status === 'none') {
    return false;
  }

  const key = getCoursePageBlockTargetKey(target);

  return selection.items.some((item) => item.key === key);
}
