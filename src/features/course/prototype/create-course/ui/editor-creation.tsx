// PROTOTYPE mm-277, variant G: «Создать курс» opens the real Course Page
// editor at `/courses/new` instead of a dialog. The four required fields are
// the editor's hero; the page content stays locked until the first save
// creates the Course, and only then the URL gets its slug (`replace` to
// `/courses/$courseSlug/edit`), where the content editor opens.
import { useEffect, useEffectEvent, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd, KbdGroup } from '@/shadcn/components/ui/kbd';
import { cn } from '@/shadcn/lib/utils';
import { PrototypeBarControls } from '@/app/prototypes/bar-controls';
import {
  getShortcutLabels,
  matchesShortcut,
} from '@/features/keyboard/shortcut';
import {
  CoursePageEditStoreProvider,
  useCoursePageEditStore,
} from '@/features/course/features/page-edit/hooks/use-editor-store';
import { saveShortcut } from '@/features/course/features/page-edit/model/shortcuts';
import { CoursePageEditHeroEditor } from '@/features/course/features/page-edit/ui/hero-editor';
import pageStyles from '@/features/course/features/page-edit/page.module.css';
import { useEditorCreationActions } from '@/features/course/prototype/create-course/hooks/use-editor-creation';
import {
  RESERVED_SLUGS,
  type Scenario,
} from '@/features/course/prototype/create-course/model/creation';
import {
  followTitle,
  slugFromTitle,
  useEditorCreation,
  type SlugMode,
} from '@/features/course/prototype/create-course/model/editor-creation';
import { checkMockSlug } from '@/features/course/prototype/create-course/model/mock-course';

type Check = 'checking' | 'available' | 'taken' | 'unavailable';

const SCENARIOS: [Scenario, string][] = [
  ['success', 'Успешное создание'],
  ['conflict', 'Адрес занят при создании'],
  ['check-failure', 'Проверка недоступна'],
  ['timeout', 'Ответ потерян'],
  ['late-success', 'Поздний успех'],
];

/** The debounced pre-check of the slug, as in the dialog. */
function useSlugCheck(slug: string, scenario: Scenario) {
  const [result, setResult] = useState<{ slug: string; check: Check }>({
    slug: '',
    check: 'checking',
  });
  useEffect(() => {
    if (!slug) {
      return;
    }
    let current = true;
    const timer = setTimeout(async () => {
      const check =
        scenario === 'check-failure'
          ? 'unavailable'
          : await checkMockSlug(slug);
      if (current) {
        setResult({ slug, check });
      }
    }, 600);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [slug, scenario]);
  return result.slug === slug ? result.check : 'checking';
}

function SlugHint({
  check,
  mode,
  empty,
}: {
  check: Check | null;
  mode: SlugMode;
  empty: boolean;
}) {
  const manual = mode === 'manual';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {empty && !manual && <span>Сформируется из названия курса.</span>}
      {check === 'checking' && (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          Проверяем адрес…
        </span>
      )}
      {check === 'available' && (
        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <Check className="size-3" />
          Адрес свободен
        </span>
      )}
      {check === 'unavailable' && (
        <span>Не удалось проверить адрес. Проверим при создании.</span>
      )}
      {manual && (
        <button
          type="button"
          className="underline underline-offset-4 hover:text-foreground"
          onClick={slugFromTitle}
        >
          Сформировать из названия
        </button>
      )}
    </div>
  );
}

function CreationBar({ slug, blocked }: { slug: string; blocked: boolean }) {
  const phase = useEditorCreation((state) => state.state.phase);
  const { submit, cancel, close } = useEditorCreationActions();
  const sending = phase === 'sending';
  const unknown = phase === 'unknown';

  const submitShortcut = useEffectEvent(() => submit(blocked));
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (matchesShortcut(event, saveShortcut)) {
        event.preventDefault();
        submitShortcut();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  let heading = 'Курс ещё не создан';
  let detail = `Адрес /courses/${slug || '…'} появится после создания. Курс будет в подготовке — студенты его не увидят.`;
  if (unknown) {
    heading = 'Не удалось подтвердить создание курса';
    detail =
      'Курс мог быть создан. Проверьте результат — второй курс не появится. Введённое сохранится до перезагрузки.';
  }

  let submitLabel = 'Создать курс';
  if (sending) {
    submitLabel = 'Создаём курс…';
  } else if (unknown) {
    submitLabel = 'Проверить результат';
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-6xl px-3 pb-3 sm:px-6 sm:py-6 lg:px-8">
      <div
        role="region"
        aria-label="Создание курса"
        className={cn(
          'flex w-full flex-col gap-3 rounded-2xl border',
          'border-border bg-card/95 p-3 text-card-foreground shadow-2xl',
          'backdrop-blur supports-[backdrop-filter]:bg-card/85',
          'sm:flex-row sm:items-center sm:justify-between sm:p-4',
          unknown && 'border-amber-500/60'
        )}
      >
        <div className="min-w-0 space-y-1" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              className={cn(
                'size-2 rounded-full',
                unknown ? 'bg-amber-500' : 'bg-primary'
              )}
              aria-hidden="true"
            />
            {heading}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">{detail}</p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={sending}
            onClick={unknown ? close : cancel}
          >
            {unknown ? 'Закрыть' : 'Отмена'}
          </Button>
          <Button
            type="button"
            disabled={sending}
            onClick={() => submit(blocked)}
          >
            {sending && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
            {!sending && (
              <KbdGroup aria-label="Горячая клавиша">
                {getShortcutLabels(saveShortcut).map((label) => (
                  <Kbd key={label}>{label}</Kbd>
                ))}
              </KbdGroup>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScenarioControls() {
  const { scenario, state, slugMode, attempted } = useEditorCreation(
    useShallow(({ scenario, state, slugMode, attempted }) => ({
      scenario,
      state,
      slugMode,
      attempted,
    }))
  );
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="font-semibold">G · Сразу редактор</span>
      <select
        aria-label="Сценарий прототипа"
        className="rounded-full bg-white/10 px-2 py-1 text-sm dark:bg-black/10"
        value={scenario}
        disabled={state.phase !== 'editing'}
        onChange={(event) =>
          useEditorCreation.setState({
            scenario: event.target.value as Scenario,
          })
        }
      >
        {SCENARIOS.map(([value, label]) => (
          <option key={value} value={value} className="text-foreground">
            {label}
          </option>
        ))}
      </select>
      <span className="text-xs opacity-70">
        {state.phase} · адрес {slugMode === 'auto' ? 'авто' : 'вручную'}
        {attempted ? ' · была попытка' : ''}
      </span>
    </div>
  );
}

function CreationEditor() {
  const edit = useEditorCreation((state) => state.edit);
  const { state, attempted, slugMode, scenario } = useEditorCreation(
    useShallow(({ state, attempted, slugMode, scenario }) => ({
      state,
      attempted,
      slugMode,
      scenario,
    }))
  );
  const workingCopy = useCoursePageEditStore((store) => store.workingCopy);
  const errors = useCoursePageEditStore((store) => store.errors);
  const isDirty = useCoursePageEditStore((store) => store.isDirty);
  const setWorkingCopy = useCoursePageEditStore(
    (store) => store.setWorkingCopy
  );
  const slug = workingCopy.courseId;
  const check = useSlugCheck(slug, scenario);

  useEffect(() => followTitle(edit), [edit]);
  useEffect(() => {
    useEditorCreation.setState({ onScreen: true });
    return () => useEditorCreation.setState({ onScreen: false });
  }, []);

  useBlocker({
    shouldBlockFn: () => {
      if (useEditorCreation.getState().state.phase !== 'sending') {
        return false;
      }
      toast.info('Дождитесь ответа: курс создаётся.');
      return true;
    },
    enableBeforeUnload: () => isDirty || state.phase !== 'editing',
  });

  const reserved = RESERVED_SLUGS.includes(slug);
  const taken =
    (state.phase === 'editing' && state.conflict) || check === 'taken';
  let slugError = attempted || slug ? errors.courseId : undefined;
  if (reserved) {
    slugError = 'Этот адрес зарезервирован.';
  } else if (taken) {
    slugError = 'Адрес недоступен.';
  }
  const shownErrors = { ...(attempted ? errors : {}), courseId: slugError };
  const frozen = state.phase === 'sending' || state.phase === 'unknown';

  return (
    <main
      id="course-edit-selection-surface"
      className={cn(
        'relative w-full pb-40 sm:py-6',
        pageStyles.selectionSurface
      )}
    >
      <div
        aria-hidden="true"
        data-plate-selectable="true"
        data-course-page-selection-start-area="true"
        className="absolute inset-0 z-0"
      />
      <div
        inert={frozen}
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-6xl flex-col',
          'sm:px-6 lg:px-8',
          frozen && 'opacity-70'
        )}
      >
        <CoursePageEditHeroEditor
          course={workingCopy}
          errors={shownErrors}
          onChange={setWorkingCopy}
          slugHint={
            <SlugHint
              check={slug && !slugError ? check : null}
              mode={slugMode}
              empty={!slug}
            />
          }
        />
        {/* Only the hero until creation: the content editor appears on
            `/courses/$courseSlug/edit`, once the Course has a Page. */}
      </div>
      <CreationBar slug={slug} blocked={reserved || taken} />
      <PrototypeBarControls>
        <ScenarioControls />
      </PrototypeBarControls>
    </main>
  );
}

export function CreateCourseEditorPage() {
  const { edit, draftKey } = useEditorCreation(
    useShallow(({ edit, draftKey }) => ({ edit, draftKey }))
  );
  return (
    <CoursePageEditStoreProvider key={draftKey} store={edit}>
      <CreationEditor />
    </CoursePageEditStoreProvider>
  );
}
