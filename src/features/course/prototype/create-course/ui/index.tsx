// PROTOTYPE mm-277: три компоновки создания курса на главной странице.
import { useEffect, useRef, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  Loader2,
  Plus,
  Users,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shadcn/components/ui/dialog';
import { Button } from '@/shadcn/components/ui/button';
import { Input } from '@/shadcn/components/ui/input';
import { useCreationPrototype } from '@/features/course/prototype/create-course/hooks/use-creation-prototype';
import type { Scenario } from '@/features/course/prototype/create-course/model/creation';
import styles from './creation.module.css';

type Controller = ReturnType<typeof useCreationPrototype>;
const variants = ['A', 'B', 'C'];
const names: Record<string, string> = {
  A: 'Короткая форма',
  B: 'Сначала название',
  C: 'С предпросмотром',
};
const scenarios: [Scenario, string][] = [
  ['success', 'Успешное создание'],
  ['conflict', 'Адрес занят при создании'],
  ['check-failure', 'Проверка недоступна'],
  ['timeout', 'Ответ потерян'],
  ['late-success', 'Поздний успех'],
];

function PrototypeBar({ control }: { control: Controller }) {
  function cycle(direction: number) {
    control.setVariant(
      variants[(variants.indexOf(control.variant) + direction + 3) % 3]
    );
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      if (
        event.target instanceof Element &&
        event.target.closest('input,textarea,select,[contenteditable]')
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        control.setVariant(
          variants[
            (variants.indexOf(control.variant) +
              (event.key === 'ArrowLeft' ? 2 : 1)) %
              3
          ]
        );
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [control]);
  if (!import.meta.env.DEV) return null;
  return (
    <div className={styles.bar} aria-label="Управление прототипом">
      <div className={styles.variantControls}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Предыдущий вариант"
          onClick={() => cycle(-1)}
        >
          <ArrowLeft />
        </Button>
        <span>
          {control.variant} · {names[control.variant]}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Следующий вариант"
          onClick={() => cycle(1)}
        >
          <ArrowRight />
        </Button>
      </div>
      <select
        aria-label="Сценарий прототипа"
        value={control.scenario}
        disabled={control.phase !== 'editing'}
        onChange={(event) =>
          control.setScenario(event.target.value as Scenario)
        }
      >
        {scenarios.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
      <details>
        <summary>Состояние</summary>
        <pre>
          {JSON.stringify(
            {
              variant: control.variant,
              scenario: control.scenario,
              phase: control.phase,
              open: control.open,
              name: control.name,
              slug: control.slug,
              slugMode: control.slugMode,
              check: control.check,
              commandId: control.commandId,
              createdCourse: control.createdCourse,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}

function AddressStatus({ control }: { control: Controller }) {
  switch (control.check) {
    case 'checking':
      return (
        <span className={styles.status}>
          <Loader2 className="size-3 animate-spin" />
          Проверяем адрес…
        </span>
      );
    case 'available':
      return (
        <span className={`${styles.status} ${styles.available}`}>
          <Check className="size-3" />
          Адрес свободен
        </span>
      );
    case 'taken':
      return <span className="text-destructive">Адрес уже занят</span>;
    case 'invalid':
      return (
        <span className="text-destructive">
          Латинские буквы, цифры и дефисы. UUID использовать нельзя.
        </span>
      );
    case 'unavailable':
      return <span>Не удалось проверить адрес. Проверим при создании.</span>;
    default:
      return <span>Это будет адрес страницы курса.</span>;
  }
}

function NameField({
  control,
  prominent = false,
}: {
  control: Controller;
  prominent?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor="course-name">
        Название курса <span aria-hidden="true">*</span>
      </label>
      <Input
        id="course-name"
        required
        value={control.name}
        disabled={control.phase !== 'editing'}
        autoFocus
        className={prominent ? styles.prominentInput : styles.input}
        placeholder="Например, Алгоритмы 2026"
        onChange={(event) => control.setName(event.target.value)}
      />
    </div>
  );
}
function AddressField({ control }: { control: Controller }) {
  return (
    <div className={styles.field}>
      <label htmlFor="course-address">
        Адрес курса <span aria-hidden="true">*</span>
      </label>
      <div className={styles.address}>
        <span>/courses/</span>
        <input
          id="course-address"
          required
          value={control.slug}
          disabled={control.phase !== 'editing'}
          aria-describedby="address-help"
          aria-invalid={
            control.check === 'invalid' || control.check === 'taken'
          }
          placeholder="algoritmy-2026"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) => control.setSlug(event.target.value)}
        />
      </div>
      <div id="address-help" className={styles.help} aria-live="polite">
        <AddressStatus control={control} />
      </div>
      {control.slugMode === 'manual' && (
        <button
          className={styles.reset}
          type="button"
          disabled={control.phase !== 'editing'}
          onClick={control.resetSlug}
        >
          Сформировать из названия
        </button>
      )}
    </div>
  );
}
function Submit({ control }: { control: Controller }) {
  const label =
    control.phase === 'unknown' ? 'Проверить результат' : 'Создать курс';
  return (
    <Button
      type="submit"
      className="h-11"
      disabled={
        control.phase === 'sending' ||
        !control.name.trim() ||
        !control.slug ||
        control.check === 'invalid' ||
        control.check === 'taken'
      }
    >
      {control.phase === 'sending' && <Loader2 className="animate-spin" />}
      {control.phase === 'sending' ? 'Создаём курс…' : label}
    </Button>
  );
}
function Unknown({ control }: { control: Controller }) {
  if (control.phase !== 'unknown') return null;
  return (
    <div className={styles.unknown} role="status">
      <strong>Не удалось подтвердить создание курса</strong>
      <p>Курс мог быть создан. Можно закрыть окно или повторить запрос.</p>
    </div>
  );
}
function Actions({ control }: { control: Controller }) {
  return (
    <div className={styles.actions}>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        disabled={control.phase === 'sending'}
        onClick={() => control.setOpen(false)}
      >
        {control.phase === 'unknown' ? 'Закрыть' : 'Отмена'}
      </Button>
      <Submit control={control} />
    </div>
  );
}
function Heading() {
  return (
    <div className={styles.heading}>
      <DialogTitle className="text-2xl leading-tight">Создать курс</DialogTitle>
      <DialogDescription>
        Начните с названия. Материалы и участников добавите позже.
      </DialogDescription>
    </div>
  );
}
function PreparationNote() {
  return (
    <div className={styles.note}>
      <BookOpen className="size-4 shrink-0" />
      <span>Курс будет в подготовке. Студенты пока его не видят.</span>
    </div>
  );
}
export function VariantA({ control }: { control: Controller }) {
  return (
    <div className={styles.variantA}>
      <Heading />
      <div className={styles.fields}>
        <NameField control={control} />
        <AddressField control={control} />
      </div>
      <Unknown control={control} />
      <PreparationNote />
      <Actions control={control} />
    </div>
  );
}
export function VariantB({ control }: { control: Controller }) {
  return (
    <div className={styles.variantB}>
      <Heading />
      <div className={styles.bigName}>
        <BookOpen className={styles.blueBook} />
        <NameField control={control} prominent />
      </div>
      <AddressField control={control} />
      <Unknown control={control} />
      <div className={styles.whatNext}>
        <div>
          <p className={styles.nextHeading}>Что появится</p>
          <p>
            <FileText />
            Страница курса
          </p>
          <p>
            <Users />
            Подгруппа 1
          </p>
        </div>
        <div className={styles.nextAction}>
          <Submit control={control} />
          <span>Откроется редактор страницы</span>
          <button
            type="button"
            disabled={control.phase === 'sending'}
            onClick={() => control.setOpen(false)}
          >
            {control.phase === 'unknown' ? 'Закрыть' : 'Отмена'}
          </button>
        </div>
      </div>
      <PreparationNote />
    </div>
  );
}
export function VariantC({ control }: { control: Controller }) {
  return (
    <div className={styles.variantC}>
      <aside className={styles.preview}>
        <p>Так курс появится в списке</p>
        <div className={styles.previewCard}>
          <BookOpen className={styles.blueBook} />
          <h3>{control.name.trim() || 'Название курса'}</h3>
          <span className={styles.badge}>В подготовке</span>
          <p>Преподаватель — вы</p>
        </div>
      </aside>
      <div className={styles.previewForm}>
        <Heading />
        <div className={styles.fields}>
          <NameField control={control} />
          <AddressField control={control} />
        </div>
        <Unknown control={control} />
        <PreparationNote />
        <Actions control={control} />
      </div>
    </div>
  );
}
export function CreateCoursePrototype({
  children,
}: {
  children: (controls: {
    trigger: ReactNode;
    emptyState: ReactNode;
  }) => ReactNode;
}) {
  const control = useCreationPrototype();
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const trigger = (
    <Button
      onClick={(event) => {
        openerRef.current = event.currentTarget;
        control.setOpen(true);
      }}
    >
      <Plus />
      Создать курс
    </Button>
  );
  const emptyState = (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <BookOpen />
      </div>
      <h2>Здесь будут ваши курсы</h2>
      <p>Создайте курс, чтобы собрать материалы и задания в одном месте.</p>
      {trigger}
      <p className={styles.studentHint}>
        Чтобы вступить в курс, откройте ссылку-приглашение от преподавателя
      </p>
    </div>
  );
  const variant = { A: VariantA, B: VariantB, C: VariantC }[control.variant];
  const Variant = variant;
  return (
    <>
      {children({ trigger, emptyState })}
      {!control.open && <PrototypeBar control={control} />}
      <Dialog open={control.open} onOpenChange={control.setOpen}>
        <DialogContent
          showCloseButton={false}
          className={styles.dialogShell}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById('course-name')?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (control.phase === 'sending') event.preventDefault();
          }}
        >
          <form
            className={`${styles.panel} ${styles[`panel${control.variant}`]}`}
            onSubmit={(event) => {
              event.preventDefault();
              control.submit();
            }}
          >
            <button
              type="button"
              className={styles.close}
              disabled={control.phase === 'sending'}
              onClick={() => control.setOpen(false)}
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
            <Variant control={control} />
          </form>
          <PrototypeBar control={control} />
        </DialogContent>
      </Dialog>
    </>
  );
}
