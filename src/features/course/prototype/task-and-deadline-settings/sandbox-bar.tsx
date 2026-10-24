// PROTOTYPE (#181): controls in the prototype bar — variants across routes
// plus sandbox switches, the Course state and scenario world.
import { RotateCcw, Settings2 } from 'lucide-react';

import { VariantStepper } from '@/app/prototypes/variant-stepper';
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
  useOpenVariant,
  usePrototypeSettings,
  useUpdatePrototypeSearch,
  VARIANTS,
  type VariantKey,
} from './search';
import {
  newTasksInDraft,
  SHIFT_VARIANTS,
  useSandboxSwitches,
  type TaskApplyMode,
} from './settings';
import { useBlockDraftView, useSandbox, type LogTone } from './store';
import { formatClock } from './time';
import { useEffectiveLease, type EffectiveLease } from './use-lease';
import { Segmented } from './ui/segmented';

const LOG_TONE: Record<LogTone, string> = {
  task: 'text-sky-700 dark:text-sky-300',
  schedule: 'text-emerald-700 dark:text-emerald-300',
  course: 'text-violet-700 dark:text-violet-300',
  conflict: 'text-red-700 dark:text-red-300',
  world: 'text-muted-foreground',
};

export function SandboxControls({ courseSlug }: { courseSlug: string }) {
  const settings = usePrototypeSettings();
  const openVariant = useOpenVariant(courseSlug);

  return (
    <>
      <VariantStepper
        variants={VARIANTS}
        current={settings.variant}
        onChange={(key) => openVariant(key as VariantKey)}
      />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 hover:bg-white/15"
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
    </>
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
  const resetSwitches = useSandboxSwitches((state) => state.resetSwitches);
  const { drafts: blockDrafts, conflicts } = useBlockDraftView();
  const blocks = settings.taskApply === 'blocks';

  return (
    <div className="grid gap-4 p-4">
      <p className="rounded-md bg-fuchsia-500/10 px-2 py-1.5 text-xs text-fuchsia-900 dark:text-fuchsia-200">
        Прототип #181. Данные песочницы живут в памяти: перезагрузка возвращает
        исходные. Переключатели ниже запоминаются в браузере.
      </p>

      <Row label="Применение дедлайнов">
        <Segmented
          value={settings.apply}
          onChange={(apply) => update({ apply })}
          options={[
            { value: 'instant', label: 'Сразу каждое значение' },
            { value: 'batch', label: '«Применить» с предпросмотром' },
          ]}
        />
      </Row>

      <Row label="Применение правок задания" hint="#129">
        <Segmented
          value={settings.taskApply}
          onChange={(taskApply) => update({ taskApply })}
          options={[
            { value: 'course', label: 'A · через черновик курса' },
            { value: 'task', label: 'D · публикация задания' },
            { value: 'contract', label: 'Контракт #129' },
            { value: 'blocks', label: 'Черновики блоков · бэкенд #187' },
          ]}
        />
      </Row>

      <Row label="Поле дедлайна в панели">
        <Segmented
          value={settings.deadlineField}
          onChange={(deadlineField) => update({ deadlineField })}
          options={[
            { value: 'full', label: 'Все переопределения в панели' },
            { value: 'counter', label: 'Общий + «Переопределений: N»' },
          ]}
        />
      </Row>

      <Row label="Окно сдвига дедлайнов">
        <Segmented
          value={settings.shift}
          onChange={(shift) => update({ shift })}
          options={SHIFT_VARIANTS}
        />
      </Row>

      <Row label="Окно даты в ячейке">
        <Segmented
          value={settings.picker}
          onChange={(picker) => update({ picker })}
          options={[
            { value: 'split', label: 'В две колонки' },
            { value: 'stack', label: 'В столбик' },
          ]}
        />
      </Row>

      <Row label="Разделы панели задания">
        <Segmented
          value={settings.panelLook}
          onChange={(panelLook) => update({ panelLook })}
          options={[
            { value: 'list', label: 'Через линии' },
            { value: 'cards', label: 'Карточками' },
          ]}
        />
      </Row>

      <Row label="Где править условие">
        <Segmented
          value={settings.statement}
          onChange={(statement) => update({ statement })}
          options={[
            { value: 'panel', label: 'В панели' },
            { value: 'inline', label: 'В документе' },
            { value: 'expanded', label: 'Развёрнутая панель' },
            {
              value: 'expanded-page',
              label: 'Развёрнутая, редактор страницы',
            },
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
          {blocks ? (
            <Toggle
              checked={sandbox.draftPage !== null}
              onChange={sandbox.setOwnBlockDrafts}
            >
              3 · У меня черновики блоков
              <span className="block text-xs text-muted-foreground">
                Задание «Docker-образ приложения» перенесено ниже, абзац про
                учебный стенд дописан
              </span>
            </Toggle>
          ) : (
            <Toggle
              checked={Boolean(sandbox.draft?.pageEdits.length)}
              onChange={sandbox.setOwnDraft}
            >
              3 · У меня неопубликованный черновик с правками страницы
            </Toggle>
          )}
          {blocks ? null : (
            <Toggle
              checked={sandbox.lease.holder === 'other'}
              onChange={sandbox.setLeaseByOther}
            >
              4 · Блокировку редактирования держит {OTHER_TEACHER.shortName}
            </Toggle>
          )}
          <Toggle
            checked={sandbox.concurrentEdit}
            onChange={sandbox.setConcurrentEdit}
          >
            5 · {OTHER_TEACHER.shortName} правит то же задание
            <span className="block text-xs text-muted-foreground">
              {concurrentEditHint(
                settings.taskApply,
                sandbox.lease.holder === 'me'
              )}
            </span>
          </Toggle>
          {blocks ? (
            <Toggle
              checked={sandbox.otherPublishesBlocks}
              onChange={sandbox.setOtherPublishesBlocks}
            >
              8 · {OTHER_TEACHER.shortName} опубликует свои черновики блоков
              раньше вас
              <span className="block text-xs text-muted-foreground">
                Сработает на «Применить» в редакторе: он правит блок, который
                правили и вы (конфликт), перемещённый вами блок и блок, которого
                вы не касались (сольются сами). Сценариев 4 и 6 здесь нет:
                блокировки курса нет, а черновик не устаревает целиком.
              </span>
            </Toggle>
          ) : (
            <Toggle
              checked={Boolean(sandbox.draft?.stale)}
              onChange={sandbox.setStaleDraft}
            >
              6 · Мой черновик устарел
            </Toggle>
          )}
          {settings.taskApply === 'contract' ? (
            <Toggle
              checked={sandbox.deletedByOther}
              onChange={sandbox.setDeletedByOther}
            >
              7 · {OTHER_TEACHER.shortName} опубликует курс без задания, которое
              вы правите
              <span className="block text-xs text-muted-foreground">
                {sandbox.courseAccess === 'draft'
                  ? 'Сработает, когда вы опубликуете правку опубликованного задания'
                  : 'Только пока курс в подготовке: после открытия задания не удаляются'}
              </span>
            </Toggle>
          ) : null}
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
          {blocks ? (
            <>
              <dt className="text-muted-foreground">Черновики блоков</dt>
              <dd>
                {blockDrafts.length}
                {conflicts.length ? `, конфликтов ${conflicts.length}` : ''}
              </dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">Блокировка</dt>
              <dd>{leaseText(effectiveLease)}</dd>
              <dt className="text-muted-foreground">Черновик</dt>
              <dd>
                {sandbox.draft
                  ? `правок страницы ${sandbox.draft.pageEdits.length}, заданий ${Object.keys(sandbox.draft.taskEdits).length}${sandbox.draft.stale ? ', устарел' : ''}`
                  : 'нет'}
              </dd>
            </>
          )}
          {newTasksInDraft(settings.taskApply) ? (
            <>
              <dt className="text-muted-foreground">Ссылки в черновике</dt>
              <dd>
                {sandbox.pageTaskIds
                  ? `${sandbox.pageTaskIds.length}, из них новых заданий ${
                      sandbox.pageTaskIds.filter((taskId) =>
                        sandbox.newTaskIds.includes(taskId)
                      ).length
                    }`
                  : 'редактор закрыт'}
              </dd>
            </>
          ) : null}
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

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={sandbox.reset}>
          <RotateCcw /> Сбросить песочницу
        </Button>
        <Button variant="outline" size="sm" onClick={resetSwitches}>
          Переключатели по вердиктам
        </Button>
      </div>
    </div>
  );
}

/** Why scenario 5 means what it means under the chosen apply mode. */
function concurrentEditHint(taskApply: TaskApplyMode, leaseIsMine: boolean) {
  switch (taskApply) {
    case 'course':
      return leaseIsMine
        ? 'В A невозможно: блокировка у вас, он не может начать правку'
        : 'В A это значит, что блокировка редактирования курса у него';
    case 'task':
      return 'В D блокировка не нужна: второй получит конфликт версий';
    case 'contract':
      return 'В контракте блокировка не нужна: второй получит конфликт версий';
    case 'blocks':
      return 'Блокировки нет: если блока задания нет в вашем черновике, правка публикуется сразу и второй получит конфликт версий';
  }
}

function leaseText({ lease, sameTask }: EffectiveLease) {
  switch (lease.holder) {
    case 'nobody':
      return 'свободна';
    case 'me':
      return 'у вас';
    case 'other':
      return `${OTHER_TEACHER.shortName}${sameTask ? ', правит это же задание' : ''}`;
  }
}
