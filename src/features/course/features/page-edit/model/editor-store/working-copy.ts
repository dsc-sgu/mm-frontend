import type { CoursePage } from '@/features/course/features/page/model/types';
import { compareCoursePages } from '@/features/course/features/page-edit/model/dirty-compare';
import {
  hasCoursePageEditErrors,
  validateCoursePageEdit,
} from '@/features/course/features/page-edit/model/validation';
import type {
  CoursePageEditStoreActions,
  CoursePageEditStoreGet,
  CoursePageEditStoreSet,
  CoursePageEditStoreState,
  CoursePageWorkingCopyUpdate,
} from '@/features/course/features/page-edit/model/editor-store/types';

function getCoursePageEditDerivedState(
  initialCourse: CoursePage,
  workingCopy: CoursePage
) {
  const errors = validateCoursePageEdit({
    title: workingCopy.title,
    shortTitle: workingCopy.shortTitle,
    courseId: workingCopy.courseId,
    description: workingCopy.description,
  });
  const isDirty = compareCoursePages(initialCourse, workingCopy);

  return {
    errors,
    isDirty,
    canApply: isDirty && !hasCoursePageEditErrors(errors),
  };
}

export function getCoursePageEditWorkingCopyState(
  initialCourse: CoursePage,
  workingCopy: CoursePage
): Pick<
  CoursePageEditStoreState,
  'canApply' | 'errors' | 'initialCourse' | 'isDirty' | 'workingCopy'
> {
  return {
    initialCourse,
    workingCopy,
    ...getCoursePageEditDerivedState(initialCourse, workingCopy),
  };
}

export function createWorkingCopyInitialState(
  course: CoursePage
): Pick<
  CoursePageEditStoreState,
  | 'canApply'
  | 'contentEditorReset'
  | 'errors'
  | 'initialCourse'
  | 'isDirty'
  | 'workingCopy'
> {
  return {
    contentEditorReset: {
      initialContent: structuredClone(course.content),
      revision: 0,
    },
    ...getCoursePageEditWorkingCopyState(course, structuredClone(course)),
  };
}

function resolveWorkingCopyUpdate(
  current: CoursePage,
  update: CoursePageWorkingCopyUpdate
) {
  return typeof update === 'function' ? update(current) : update;
}

export function createWorkingCopyActions(
  set: CoursePageEditStoreSet,
  get: CoursePageEditStoreGet
): Pick<
  CoursePageEditStoreActions,
  | 'changeResources'
  | 'markWorkingCopySaved'
  | 'resetWorkingCopy'
  | 'setContentFromEditor'
  | 'setWorkingCopy'
> {
  return {
    changeResources: (resources) =>
      get().setWorkingCopy((current) => ({ ...current, resources })),
    markWorkingCopySaved: (savedWorkingCopy) =>
      set((state) =>
        getCoursePageEditWorkingCopyState(
          structuredClone(savedWorkingCopy),
          state.workingCopy
        )
      ),
    resetWorkingCopy: () =>
      set((state) => ({
        ...getCoursePageEditWorkingCopyState(
          state.initialCourse,
          structuredClone(state.initialCourse)
        ),
        contentEditorReset: {
          initialContent: structuredClone(state.initialCourse.content),
          revision: state.contentEditorReset.revision + 1,
        },
      })),
    setContentFromEditor: ({ content, editorRevision }) =>
      set((state) => {
        if (state.contentEditorReset.revision !== editorRevision) {
          return state;
        }

        return getCoursePageEditWorkingCopyState(state.initialCourse, {
          ...state.workingCopy,
          content,
        });
      }),
    setWorkingCopy: (update) =>
      set((state) => {
        const workingCopy = resolveWorkingCopyUpdate(state.workingCopy, update);

        return getCoursePageEditWorkingCopyState(
          state.initialCourse,
          workingCopy
        );
      }),
  };
}
