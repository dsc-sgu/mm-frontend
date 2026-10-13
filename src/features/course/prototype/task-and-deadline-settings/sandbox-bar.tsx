// PROTOTYPE (#181): the floating bar — variants across routes plus sandbox
// switches (`?apply`, `?taskApply`, panel options) and scenario world.
import { RotateCcw, Settings2 } from 'lucide-react';

import { PrototypeSwitcher } from '@/app/prototype-switcher';
import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import { OTHER_TEACHER } from './fixture';
import {
  SHIFT_VARIANTS,
  useOpenVariant,
  usePrototypeSettings,
  useUpdatePrototypeSearch,
  VARIANTS,
  type VariantKey,
} from './search';
import { useSandbox, type LogTone } from './store';
import { formatClock } from './time';
import { useEffectiveLease } from './use-lease';
import { Segmented } from './ui/segmented';

const LOG_TONE: Record<LogTone, string> = {
  task: 'text-sky-700 dark:text-sky-300',
  schedule: 'text-emerald-700 dark:text-emerald-300',
  course: 'text-violet-700 dark:text-violet-300',
  conflict: 'text-red-700 dark:text-red-300',
  world: 'text-muted-foreground',
};

export function SandboxBar({ courseSlug }: { courseSlug: string }) {
  const settings = usePrototypeSettings();
  const openVariant = useOpenVariant(courseSlug);

  return (
    <PrototypeSwitcher
      variants={VARIANTS}
      current={settings.variant ?? ''}
      onChange={(key) => openVariant(key as VariantKey)}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-full px-2.5 hover:bg-white/15"
          >
            <Settings2 className="size-4" />
            <span className="hidden sm:inline">Песочница</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          className="z-[110] max-h-[80dvh] w-[min(28rem,calc(100vw-1rem))] overflow-y-auto p-0"
        >
          <SandboxSettings />
        </PopoverContent>
      </Popover>
    </PrototypeSwitcher>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {hint ? <span className="font-normal"> · {hint}</span> : null}
      </span>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <Checkbox
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span>{children}</span>
    </label>
  );
}

function SandboxSettings() {
  const settings = usePrototypeSettings();
  const update = useUpdatePrototypeSearch();
  const sandbox = useSandbox();
  const effectiveLease = useEffectiveLease();

  return (
    <div className="grid gap-4 p-4">
      <p className="rounded-md bg-fuchsia-500/10 px-2 py-1.5 text-xs text-fuchsia-900 dark:text-fuchsia-200">
        Прототип #181. Всё в памяти: перезагрузка возвращает исходные данные.
      </p>

      <Row label="Применение дедлайнов" hint="?apply">
        <Segmented
          value={settings.apply}
          onChange={(apply) => update({ apply })}
          options={[
            { value: 'instant', label: 'Сразу каждое значение' },
            { value: 'batch', label: '«Применить» с предпросмотром' },
          ]}
        />
      </Row>

      <Row label="Применение правок задания" hint="?taskApply, #129">
        <Segmented
          value={settings.taskApply}
          onChange={(taskApply) => update({ taskApply })}
          options={[
            { value: 'course', label: 'A · через черновик курса' },
            { value: 'task', label: 'D · публикация задания' },
          ]}
        />
      </Row>

      <Row label="Поле дедлайна в панели" hint="?deadlineField">
        <Segmented
          value={settings.deadlineField}
          onChange={(deadlineField) => update({ deadlineField })}
          options={[
            { value: 'full', label: 'Все переопределения в панели' },
            { value: 'counter', label: 'Общий + «Переопределений: N»' },
          ]}
        />
      </Row>

      <Row label="Окно сдвига дедлайнов" hint="?shift">
        <Segmented
          value={settings.shift}
          onChange={(shift) => update({ shift })}
          options={SHIFT_VARIANTS}
        />
      </Row>

      <Row label="Окно даты в ячейке" hint="?picker">
        <Segmented
          value={settings.picker}
          onChange={(picker) => update({ picker })}
          options={[
            { value: 'split', label: 'В две колонки' },
            { value: 'stack', label: 'В столбик' },
          ]}
        />
      </Row>

      <Row label="Где править условие" hint="?statement">
        <Segmented
          value={settings.statement}
          onChange={(statement) => update({ statement })}
          options={[
            { value: 'panel', label: 'В панели' },
            { value: 'inline', label: 'В документе' },
            { value: 'expanded', label: 'Развёрнутая панель' },
          ]}
        />
      </Row>

      <Row label="Доступ к курсу">
        <Segmented
          value={sandbox.courseAccess}
          onChange={sandbox.setCourseAccess}
          options={[
            { value: 'open', label: 'открыт' },
            { value: 'draft', label: 'в подготовке' },
          ]}
        />
      </Row>

      <Row label="Сценарии применения правок задания">
        <div className="grid gap-1.5">
          <Toggle
            checked={Boolean(sandbox.draft?.pageEdits.length)}
            onChange={sandbox.setOwnDraft}
          >
            3 · У меня неопубликованный черновик с правками страницы
          </Toggle>
          <Toggle
            checked={sandbox.lease.holder === 'other'}
            onChange={sandbox.setLeaseByOther}
          >
            4 · Блокировку редактирования держит {OTHER_TEACHER.shortName}
          </Toggle>
          <Toggle
            checked={sandbox.concurrentEdit}
            onChange={sandbox.setConcurrentEdit}
          >
            5 · {OTHER_TEACHER.shortName} правит то же задание
            <span className="block text-xs text-muted-foreground">
              {settings.taskApply === 'course'
                ? sandbox.lease.holder === 'me'
                  ? 'В A невозможно: блокировка у вас, он не может начать правку'
                  : 'В A это значит, что блокировка редактирования курса у него'
                : 'В D блокировка не нужна: второй получит конфликт версий'}
            </span>
          </Toggle>
          <Toggle
            checked={Boolean(sandbox.draft?.stale)}
            onChange={sandbox.setStaleDraft}
          >
            6 · Мой черновик устарел
          </Toggle>
          <Toggle
            checked={sandbox.failNextSave}
            onChange={sandbox.setFailNextSave}
          >
            Следующее сохранение дедлайнов упадёт
          </Toggle>
        </div>
      </Row>

      <Row label="Состояние">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-muted-foreground">Блокировка</dt>
          <dd>
            {effectiveLease.lease.holder === 'nobody'
              ? 'свободна'
              : effectiveLease.lease.holder === 'me'
                ? 'у вас'
                : `${OTHER_TEACHER.shortName}${effectiveLease.sameTask ? ', правит это же задание' : ''}`}
          </dd>
          <dt className="text-muted-foreground">Черновик</dt>
          <dd>
            {sandbox.draft
              ? `правок страницы ${sandbox.draft.pageEdits.length}, заданий ${Object.keys(sandbox.draft.taskEdits).length}${sandbox.draft.stale ? ', устарел' : ''}`
              : 'нет'}
          </dd>
          <dt className="text-muted-foreground">Дедлайны</dt>
          <dd>не применено {sandbox.pending.length} команд</dd>
        </dl>
      </Row>

      <Row label="Журнал">
        {sandbox.log.length === 0 ? (
          <p className="text-xs text-muted-foreground">Пока пусто.</p>
        ) : (
          <ol className="grid max-h-40 gap-1 overflow-y-auto text-xs">
            {sandbox.log.slice(0, 30).map((entry) => (
              <li key={entry.id} className={cn(LOG_TONE[entry.tone])}>
                <span className="text-muted-foreground tabular-nums">
                  {formatClock(entry.at)}
                </span>{' '}
                {entry.text}
              </li>
            ))}
          </ol>
        )}
      </Row>

      <Button variant="outline" size="sm" onClick={sandbox.reset}>
        <RotateCcw /> Сбросить песочницу
      </Button>
    </div>
  );
}
