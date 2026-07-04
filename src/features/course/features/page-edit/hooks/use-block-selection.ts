import { useMemo, useState } from 'react';

import {
  createCoursePageBlockSelectionItem,
  type CoursePageBlockSelection,
  type CoursePageBlockSelectionContextValue,
  type CoursePageBlockSelectionTarget,
} from '@/features/course/features/page-edit/model/block-selection';

export function useCoursePageBlockSelectionValue(): CoursePageBlockSelectionContextValue {
  const [selection, setSelection] = useState<CoursePageBlockSelection>({
    status: 'none',
  });

  return useMemo(
    () => ({
      selection,
      selectOnlyBlock: (target: CoursePageBlockSelectionTarget) => {
        const item = createCoursePageBlockSelectionItem(target);

        setSelection({
          status: 'selected',
          anchorKey: item.key,
          items: [item],
        });
      },
      replaceBlockSelection: (targets: CoursePageBlockSelectionTarget[]) => {
        const items = targets.map(createCoursePageBlockSelectionItem);

        if (items.length === 0) {
          setSelection({ status: 'none' });
          return;
        }

        setSelection({
          status: 'selected',
          anchorKey: items.at(-1)?.key ?? items[0].key,
          items,
        });
      },
      clearBlockSelection: () => setSelection({ status: 'none' }),
    }),
    [selection]
  );
}
