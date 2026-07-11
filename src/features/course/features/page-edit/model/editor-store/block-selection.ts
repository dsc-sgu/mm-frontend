import {
  createCoursePageBlockSelectionItem,
  type CoursePageBlockSelection,
} from '@/features/course/features/page-edit/model/block-selection';
import type {
  CoursePageEditStoreActions,
  CoursePageEditStoreGet,
  CoursePageEditStoreSet,
} from '@/features/course/features/page-edit/model/editor-store/types';

export const initialBlockSelection: CoursePageBlockSelection = {
  status: 'none',
};

export function createBlockSelectionActions(
  set: CoursePageEditStoreSet,
  get: CoursePageEditStoreGet
): Pick<
  CoursePageEditStoreActions,
  'clearBlockSelection' | 'replaceBlockSelection' | 'selectOnlyBlock'
> {
  return {
    clearBlockSelection: () =>
      set((state) =>
        state.blockSelection.status === 'none'
          ? state
          : { blockSelection: initialBlockSelection }
      ),
    replaceBlockSelection: (targets) => {
      const items = targets.map(createCoursePageBlockSelectionItem);

      if (items.length === 0) {
        get().clearBlockSelection();
        return;
      }

      set({
        blockSelection: {
          status: 'selected',
          anchorKey: items.at(-1)?.key ?? items[0].key,
          items,
        },
      });
    },
    selectOnlyBlock: (target) => {
      const item = createCoursePageBlockSelectionItem(target);

      set({
        blockSelection: {
          status: 'selected',
          anchorKey: item.key,
          items: [item],
        },
      });
    },
  };
}
