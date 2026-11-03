// PROTOTYPE mm-277, variant G: no dialog — «Создать курс» opens the Course
// Page editor at `/courses/new`, and the Course is created by the editor's
// first save. Until then the Course has neither id nor slug on the server,
// so the draft lives here, outside the route: it survives leaving the page
// and is lost on reload, like the dialog's form.
import { create } from 'zustand';

import type { CoursePage } from '@/features/course/features/page/model/types';
import { createCoursePageEditStore } from '@/features/course/features/page-edit/model/editor-store';
import type { CoursePageEditStoreApi } from '@/features/course/features/page-edit/model/editor-store/types';
import {
  suggestSlug,
  transition,
  type CreatedCourse,
  type CreationEvent,
  type CreationState,
  type Scenario,
} from './creation';

export type SlugMode = 'auto' | 'manual';

function emptyPage(): CoursePage {
  return {
    courseId: '',
    title: '',
    shortTitle: '',
    description: '',
    color: 'blue',
    iconName: 'book-open',
    teachers: [],
    resources: { images: [], files: [], assignments: [] },
    content: [],
  };
}

type EditorCreation = {
  /** The real editor store; its working copy is the whole creation form. */
  edit: CoursePageEditStoreApi;
  /** Changes with every new draft, to remount the Plate editor. */
  draftKey: number;
  slugMode: SlugMode;
  state: CreationState;
  scenario: Scenario;
  /** Field errors show only after the first «Создать курс». */
  attempted: boolean;
  /** Whether `/courses/new` is on screen; decides navigate vs toast. */
  onScreen: boolean;
};

let draftNumber = 0;

function fresh(): Pick<
  EditorCreation,
  'edit' | 'draftKey' | 'slugMode' | 'state' | 'attempted'
> {
  draftNumber += 1;
  return {
    edit: createCoursePageEditStore({ course: emptyPage() }),
    draftKey: draftNumber,
    slugMode: 'auto',
    state: { phase: 'editing', conflict: false },
    attempted: false,
  };
}

export const useEditorCreation = create<EditorCreation>()(() => ({
  ...fresh(),
  scenario: 'success',
  onScreen: false,
}));

export function dispatchCreation(event: CreationEvent) {
  useEditorCreation.setState((current) => ({
    state: transition(current.state, event),
  }));
}

/** «Отмена» and a successful creation start over with an empty draft. */
export function resetEditorCreation() {
  useEditorCreation.setState(fresh());
}

/** The command the editor's first save sends. */
export function commandFrom(page: CoursePage): CreatedCourse {
  return {
    id: crypto.randomUUID(),
    name: page.title.trim(),
    shortTitle: page.shortTitle.trim(),
    description: page.description.trim(),
    slug: page.courseId,
    page: structuredClone({
      color: page.color,
      iconName: page.iconName,
      content: page.content,
      resources: page.resources,
    }),
  };
}

/**
 * Keeps the slug suggested from the title until the Teacher edits the slug
 * by hand, as in the dialog. Returns the unsubscribe function.
 */
export function followTitle(edit: CoursePageEditStoreApi) {
  return edit.subscribe((next, previous) => {
    const { title, courseId } = next.workingCopy;
    if (courseId !== previous.workingCopy.courseId) {
      // A new slug clears the «Адрес недоступен» of a failed creation.
      dispatchCreation({ type: 'edit' });
      if (courseId !== suggestSlug(title)) {
        useEditorCreation.setState({ slugMode: 'manual' });
      }
      return;
    }
    if (
      title !== previous.workingCopy.title &&
      useEditorCreation.getState().slugMode === 'auto'
    ) {
      next.setWorkingCopy((page) => ({
        ...page,
        courseId: suggestSlug(page.title),
      }));
    }
  });
}

export function slugFromTitle() {
  const { edit } = useEditorCreation.getState();
  useEditorCreation.setState({ slugMode: 'auto' });
  edit.getState().setWorkingCopy((page) => ({
    ...page,
    courseId: suggestSlug(page.title),
  }));
}
