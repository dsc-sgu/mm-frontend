// PROTOTYPE mm-277, variant G: the first save of `/courses/new` creates the
// Course. Same outcomes and scenarios as the dialog (use-creation-prototype),
// but the timers live at module level: a late success after the Teacher left
// the page still lands, as a toast with a link.
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { coursesKeys } from '@/features/course/api/queries';
import { invalidateCourseContextsAfterMetadataSave } from '@/features/course/features/access/api/queries';
import { hasCoursePageEditErrors } from '@/features/course/features/page-edit/model/validation';
import type { CreatedCourse } from '@/features/course/prototype/create-course/model/creation';
import {
  commandFrom,
  dispatchCreation,
  resetEditorCreation,
  useEditorCreation,
} from '@/features/course/prototype/create-course/model/editor-creation';
import { registerMockCourse } from '@/features/course/prototype/create-course/model/mock-course';

type Navigate = ReturnType<typeof useNavigate>;

let timers: ReturnType<typeof setTimeout>[] = [];

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

const FIELD_BY_ERROR = {
  title: 'course-edit-title',
  shortTitle: 'course-edit-short-title',
  courseId: 'course-edit-slug',
  description: 'course-edit-description',
} as const;

function focusFirstInvalid(errors: Record<string, string | undefined>) {
  const key = Object.keys(FIELD_BY_ERROR).find((name) => errors[name]);
  if (key) {
    document
      .getElementById(FIELD_BY_ERROR[key as keyof typeof FIELD_BY_ERROR])
      ?.focus();
  }
}

async function finish(
  course: CreatedCourse,
  navigate: Navigate,
  queryClient: QueryClient
) {
  clearTimers();
  const result = await registerMockCourse(course);
  if (result.status === 'conflict') {
    dispatchCreation({ type: 'conflict' });
    focusFirstInvalid({ courseId: 'taken' });
    return;
  }
  if (result.status === 'unavailable') {
    dispatchCreation({ type: 'timeout' });
    toast.error('Для прототипа нужен режим mock-бэкенда');
    return;
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: coursesKeys.all }),
    invalidateCourseContextsAfterMetadataSave(
      queryClient,
      course.slug,
      course.slug
    ),
  ]);
  dispatchCreation({ type: 'succeed', course });
  const open = () =>
    navigate({
      to: '/courses/$courseSlug/edit',
      params: { courseSlug: course.slug },
      replace: true,
    });
  if (useEditorCreation.getState().onScreen) {
    // The URL gets the slug only now; `replace` keeps «Назад» from
    // returning to an empty `/courses/new`.
    await open();
    toast.success('Курс создан', { description: 'Можно продолжать.' });
  } else {
    toast.success('Курс создан', {
      description: course.name,
      action: { label: 'Открыть курс', onClick: () => void open() },
    });
  }
  resetEditorCreation();
}

export function useEditorCreationActions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function submit(slugTaken: boolean) {
    const { state, edit, scenario } = useEditorCreation.getState();
    if (state.phase === 'sending' || state.phase === 'success') {
      return;
    }
    const retry = state.phase === 'unknown';
    if (!retry) {
      const { errors, workingCopy } = edit.getState();
      useEditorCreation.setState({ attempted: true });
      if (hasCoursePageEditErrors(errors) || slugTaken) {
        focusFirstInvalid(slugTaken ? { courseId: 'taken' } : errors);
        toast.error('Заполните поля курса перед созданием.');
        return;
      }
      dispatchCreation({ type: 'send', command: commandFrom(workingCopy) });
    } else {
      dispatchCreation({ type: 'send', command: state.command });
    }
    const sent = useEditorCreation.getState().state;
    if (sent.phase !== 'sending') {
      return;
    }
    const command = sent.command;
    clearTimers();
    timers.push(
      setTimeout(() => dispatchCreation({ type: 'timeout' }), 15_000)
    );
    if (scenario === 'timeout' && !retry) {
      return;
    }
    const delay = scenario === 'late-success' && !retry ? 20_000 : 1100;
    timers.push(
      setTimeout(() => {
        if (scenario === 'conflict') {
          clearTimers();
          dispatchCreation({ type: 'conflict' });
          focusFirstInvalid({ courseId: 'taken' });
          return;
        }
        void finish(command, navigate, queryClient);
      }, delay)
    );
  }

  /** Before sending: drop the draft and return to the dashboard. */
  function cancel() {
    clearTimers();
    resetEditorCreation();
    void navigate({ to: '/', search: { variant: 'G' } });
  }

  /** Unknown outcome: leave, keeping the frozen draft and its command. */
  function close() {
    void navigate({ to: '/', search: { variant: 'G' } });
  }

  return { submit, cancel, close };
}
