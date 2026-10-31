// PROTOTYPE mm-277: one instance owned by the dashboard wrapper.
import { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  suggestSlug,
  transition,
  validSlug,
} from '@/features/course/prototype/create-course/model/creation';
import type {
  CreatedCourse,
  Scenario,
} from '@/features/course/prototype/create-course/model/creation';

type Check =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'unavailable'
  | 'invalid';
export function useCreationPrototype() {
  const [state, dispatch] = useReducer(transition, {
    phase: 'editing',
    conflict: false,
  });
  const [name, updateName] = useState('');
  const [slug, updateSlug] = useState('');
  const [slugMode, setSlugMode] = useState<'auto' | 'manual'>('auto');
  const [open, updateOpen] = useState(false);
  const [editorCourse, setEditorCourse] = useState<CreatedCourse | null>(null);
  const [createdCourses, setCreatedCourses] = useState<CreatedCourse[]>([]);
  const [scenario, updateScenario] = useState<Scenario>('success');
  const [check, setCheck] = useState<Check>('idle');
  const openRef = useRef(open);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { variant?: string };
  const variant =
    search.variant === 'B' || search.variant === 'C' ? search.variant : 'A';
  function setOpen(next: boolean) {
    if (!next && state.phase === 'sending') return;
    if (next && state.phase === 'success') dispatch({ type: 'reset' });
    openRef.current = next;
    updateOpen(next);
  }
  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!slug) return;
    const timer = setTimeout(
      () =>
        setCheck(scenario === 'check-failure' ? 'unavailable' : 'available'),
      600
    );
    return () => clearTimeout(timer);
  }, [slug, scenario]);
  function changedSlug(value: string) {
    updateSlug(value);
    if (value !== slug) setCheck(value ? 'checking' : 'idle');
    dispatch({ type: 'edit' });
  }
  function setName(value: string) {
    if (state.phase !== 'editing') return;
    updateName(value);
    if (slugMode === 'auto') changedSlug(suggestSlug(value));
  }
  function setSlug(value: string) {
    if (state.phase !== 'editing') return;
    setSlugMode('manual');
    changedSlug(value);
  }
  function resetSlug() {
    if (state.phase !== 'editing') return;
    setSlugMode('auto');
    changedSlug(suggestSlug(name));
  }
  function showEditor(course: CreatedCourse) {
    setEditorCourse(course);
    openRef.current = false;
    updateOpen(false);
  }
  function finish(course: CreatedCourse) {
    clearTimers();
    dispatch({ type: 'succeed', course });
    setCreatedCourses((courses) =>
      courses.some((item) => item.id === course.id)
        ? courses
        : [course, ...courses]
    );
    if (!openRef.current) {
      toast.success('Курс создан', {
        description: course.name,
        action: {
          label: 'Открыть курс',
          onClick: () => showEditor(course),
        },
      });
    } else {
      showEditor(course);
    }
    updateName('');
    updateSlug('');
    setSlugMode('auto');
  }
  function submit() {
    if (state.phase === 'sending' || state.phase === 'success') return;
    if (state.phase === 'editing' && (!name.trim() || !validSlug(slug))) return;
    const retry = state.phase === 'unknown';
    const command = retry
      ? state.command
      : { id: crypto.randomUUID(), name: name.trim(), slug };
    clearTimers();
    dispatch({ type: 'send', command });
    timers.current.push(
      setTimeout(() => dispatch({ type: 'timeout' }), 15_000)
    );
    if (scenario === 'timeout' && !retry) return;
    const delay = scenario === 'late-success' && !retry ? 20_000 : 1100;
    timers.current.push(
      setTimeout(() => {
        if (scenario === 'conflict') {
          clearTimers();
          dispatch({ type: 'conflict' });
          return;
        }
        finish(command);
      }, delay)
    );
  }
  function reset() {
    clearTimers();
    setEditorCourse(null);
    dispatch({ type: 'reset' });
    updateName('');
    updateSlug('');
    setSlugMode('auto');
    setCheck('idle');
    openRef.current = false;
    updateOpen(false);
  }
  const shownCheck = !slug ? 'idle' : check;
  let effectiveCheck: Check = shownCheck;
  if (slug && !validSlug(slug)) effectiveCheck = 'invalid';
  if (state.phase === 'editing' && state.conflict) effectiveCheck = 'taken';
  return {
    name,
    slug,
    slugMode,
    check: effectiveCheck,
    phase: state.phase,
    open,
    setOpen,
    setName,
    setSlug,
    resetSlug,
    submit,
    scenario,
    setScenario: (next: Scenario) => {
      if (state.phase === 'editing') {
        updateScenario(next);
        setCheck(slug ? 'checking' : 'idle');
      }
    },
    reset,
    createdCourse:
      editorCourse ?? (state.phase === 'success' ? state.course : null),
    editorShown: editorCourse !== null,
    createdCourses,
    showEditor,
    backToCourses: () => setEditorCourse(null),
    commandId:
      state.phase === 'sending' || state.phase === 'unknown'
        ? state.command.id
        : null,
    variant,
    setVariant: (next: string) =>
      void navigate({ to: '/', search: { variant: next }, replace: true }),
  };
}
