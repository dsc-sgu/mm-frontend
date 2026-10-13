// PROTOTYPE (#181): in-memory fixture for «Современные информационные
// технологии». A page reload returns everything to this state.
import type {
  CourseContentBlockItem,
  CoursePageResources,
} from '@/features/course/features/page/model/types';
import type {
  Attempt,
  DeadlineOverride,
  Schedule,
  Student,
  StudentGroup,
} from './schedule';
import { NOW } from './time';

export type TaskTemplate =
  | { state: 'empty' }
  | { state: 'ready'; commit: string; message: string; at: number };

export type TaskGroup = {
  id: string;
  title: string;
  key: string;
  template: TaskTemplate;
  /** Explicit execution order inside the group. */
  taskIds: string[];
};

export type Attachment = { name: string; size: string };

/** Task properties outside the schedule (#180 «Поля панели»). */
export type TaskProps = {
  title: string;
  key: string;
  groupId: string;
  maxGrade: number | null;
  statement: string;
  annotation: string;
  attachments: Attachment[];
  patterns: string[];
};

export type Task = TaskProps & { id: string; version: number };

export type Teacher = { username: string; shortName: string };

export const ME: Teacher = { username: 'mit-teacher', shortName: 'Вы' };
export const OTHER_TEACHER: Teacher = {
  username: 'gohy279',
  shortName: 'Архипов И. С.',
};

const at = (local: string) => new Date(`${local}+04:00`).getTime();
const deadline = (day: string) =>
  ({ kind: 'at', at: at(`${day}T23:59:00`) }) as const;
const opening = (day: string) => at(`${day}T00:00:00`);

export const STUDENT_GROUPS: StudentGroup[] = [
  { id: 'g151-1', name: '151-1пп' },
  { id: 'g151-2', name: '151-2пп' },
  { id: 'g111-1', name: '111-1пп' },
  { id: 'g111-2', name: '111-2пп' },
];

const SURNAMES = [
  'Иванов',
  'Смирнов',
  'Кузнецов',
  'Попов',
  'Васильев',
  'Петров',
  'Соколов',
  'Михайлов',
  'Новиков',
  'Фёдоров',
  'Морозов',
  'Волков',
  'Алексеев',
  'Лебедев',
  'Семёнов',
  'Егоров',
  'Павлов',
  'Козлов',
  'Степанов',
  'Николаев',
  'Орлов',
  'Андреев',
  'Макаров',
  'Никитин',
  'Захаров',
  'Зайцев',
  'Соловьёв',
  'Борисов',
  'Яковлев',
  'Григорьев',
  'Романов',
  'Воробьёв',
  'Сергеев',
  'Кузьмин',
  'Фролов',
  'Александров',
  'Дмитриев',
  'Королёв',
  'Гусев',
  'Киселёв',
  'Ильин',
  'Максимов',
  'Поляков',
  'Сорокин',
  'Виноградов',
  'Ковалёв',
  'Белов',
  'Медведев',
];

const MALE_NAMES = [
  'Александр',
  'Дмитрий',
  'Максим',
  'Сергей',
  'Андрей',
  'Алексей',
  'Артём',
  'Илья',
  'Кирилл',
  'Михаил',
  'Никита',
  'Матвей',
  'Роман',
  'Егор',
  'Арсений',
  'Иван',
  'Денис',
  'Евгений',
  'Даниил',
  'Тимофей',
  'Владислав',
  'Игорь',
  'Павел',
];

const FEMALE_NAMES = [
  'Анастасия',
  'Мария',
  'Анна',
  'Виктория',
  'Екатерина',
  'Полина',
  'Софья',
  'Дарья',
  'Алина',
  'Ксения',
  'Елизавета',
  'Валерия',
  'Ольга',
  'Юлия',
  'Вероника',
  'Арина',
  'Ульяна',
];

const FATHER_NAMES = [
  ['Александрович', 'Александровна'],
  ['Дмитриевич', 'Дмитриевна'],
  ['Сергеевич', 'Сергеевна'],
  ['Андреевич', 'Андреевна'],
  ['Алексеевич', 'Алексеевна'],
  ['Игоревич', 'Игоревна'],
  ['Михайлович', 'Михайловна'],
  ['Николаевич', 'Николаевна'],
  ['Владимирович', 'Владимировна'],
  ['Олегович', 'Олеговна'],
  ['Евгеньевич', 'Евгеньевна'],
  ['Павлович', 'Павловна'],
  ['Викторович', 'Викторовна'],
  ['Юрьевич', 'Юрьевна'],
] as const;

export const STUDENTS: Student[] = SURNAMES.map((surname, index) => {
  const female = index % 3 === 1;
  const [male, femalePatronymic] = FATHER_NAMES[(index * 5) % 14]!;

  return {
    id: `s${index}`,
    lastName: female ? `${surname}а` : surname,
    firstName: female
      ? FEMALE_NAMES[(index * 7) % FEMALE_NAMES.length]!
      : MALE_NAMES[(index * 7) % MALE_NAMES.length]!,
    patronymic: female ? femalePatronymic : male,
    groupId: STUDENT_GROUPS[Math.floor(index / 12)]!.id,
  };
});

export function studentName(student: Student) {
  return `${student.lastName} ${student.firstName[0]}. ${student.patronymic[0]}.`;
}

export function studentFullName(student: Student) {
  return `${student.lastName} ${student.firstName} ${student.patronymic}`;
}

const DOCKER_STATEMENT = `Соберите Docker-образ для веб-приложения из прошлых лабораторных и опишите, как его запускать.

## Что нужно сделать

1. Напишите \`Dockerfile\` в каталоге \`docker/\`. Используйте многоэтапную сборку: на первом этапе установите зависимости и соберите приложение, на втором оставьте только то, что нужно для запуска.
2. Базовый образ — \`python:3.12-slim\` или \`node:22-alpine\`, в зависимости от языка вашего приложения. Не используйте тег \`latest\`.
3. Приложение внутри контейнера должно работать от непривилегированного пользователя.
4. Добавьте \`.dockerignore\`, чтобы в образ не попадали \`.git\`, виртуальные окружения, \`node_modules\` и локальные настройки.
5. Порт приложения задаётся переменной окружения \`PORT\`, по умолчанию 8080.
6. Добавьте \`HEALTHCHECK\`, который обращается к \`/health\`.

## Ограничения

- Итоговый образ не больше 200 МБ. Проверьте командой \`docker image ls\`.
- Сборка с нуля занимает не больше 3 минут на ноутбуке из аудитории 412.
- Секреты нельзя класть в образ: ни в \`ENV\`, ни в файлы.

## Что сдать

- \`docker/Dockerfile\` и \`docker/.dockerignore\`;
- \`docker/README.md\`: как собрать образ, как запустить контейнер, какие переменные окружения он принимает;
- скриншот или вывод \`docker image ls\` с размером образа в \`docker/size.txt\`.

## Как будем проверять

Преподаватель соберёт образ командой \`docker build -t lab4 docker/\` и запустит \`docker run -p 8080:8080 lab4\`. Затем проверит \`/health\` и две страницы из лабораторной про HTTP-сервер.

## Частые ошибки

- Копирование всего репозитория одной командой \`COPY . .\` до установки зависимостей: каждая правка кода заново скачивает зависимости.
- Запуск от root.
- \`CMD\` в shell-форме, из-за которой контейнер не получает SIGTERM и останавливается 10 секунд.

Вопросы задавайте в чате курса до 24 октября. После этой даты консультаций по лабораторной не будет.`;

type TaskSeed = Omit<Task, 'version' | 'groupId'> & {
  deadline: Schedule['tasks'][string]['deadline'];
  openingTime: number | null;
};

const LAB_TASKS: TaskSeed[] = [
  {
    id: 'git-basics',
    title: 'Git: первый репозиторий',
    key: 'git-basics',
    maxGrade: 10,
    statement:
      'Создайте репозиторий курса, настройте имя и почту в Git и сделайте три осмысленных коммита. Сдайте ссылку на последний коммит.',
    annotation: 'Нужен аккаунт на платформе курса.',
    attachments: [],
    patterns: ['git-basics/**'],
    deadline: deadline('2026-09-15'),
    openingTime: opening('2026-09-01'),
  },
  {
    id: 'branching',
    title: 'Ветки и слияния',
    key: 'branching',
    maxGrade: 10,
    statement:
      'Разработайте небольшую функцию в отдельной ветке, разрешите подготовленный конфликт слияния и опишите в README, как вы его разрешили.',
    annotation: '',
    attachments: [{ name: 'conflict-scenario.md', size: '3 КБ' }],
    patterns: ['branching/**', 'README.md'],
    deadline: deadline('2026-09-29'),
    openingTime: opening('2026-09-08'),
  },
  {
    id: 'ci',
    title: 'CI: проверки на каждый push',
    key: 'ci',
    maxGrade: 10,
    statement:
      'Настройте конвейер, который на каждый push собирает Docker-образ из прошлой лабораторной, запускает линтер и тесты.',
    annotation: 'Опирается на лабораторную про Docker-образ.',
    attachments: [],
    patterns: ['.ci/**', 'ci/**'],
    deadline: deadline('2026-11-03'),
    openingTime: opening('2026-10-13'),
  },
  {
    id: 'docker',
    title: 'Docker-образ приложения',
    key: 'docker',
    maxGrade: 10,
    statement: DOCKER_STATEMENT,
    annotation: 'Понадобится Docker Desktop или Podman.',
    attachments: [
      { name: 'Dockerfile.example', size: '2 КБ' },
      { name: 'Критерии проверки.pdf', size: '84 КБ' },
    ],
    patterns: ['docker/**'],
    deadline: deadline('2026-10-27'),
    openingTime: opening('2026-10-06'),
  },
  {
    id: 'compose',
    title: 'Docker Compose: приложение и база',
    key: 'compose',
    maxGrade: 10,
    statement:
      'Опишите в compose.yaml приложение, PostgreSQL и миграции. Данные базы должны переживать перезапуск.',
    annotation: '',
    attachments: [],
    patterns: ['compose/**', 'compose.yaml'],
    deadline: deadline('2026-11-17'),
    openingTime: opening('2026-10-27'),
  },
  {
    id: 'deploy',
    title: 'Деплой в облако',
    key: 'deploy',
    maxGrade: 10,
    statement:
      'Разверните приложение на учебном облачном стенде по инструкции. Сдайте адрес и описание того, как обновлять версию без простоя.',
    annotation: '',
    attachments: [{ name: 'Доступ к стенду.pdf', size: '120 КБ' }],
    patterns: ['deploy/**'],
    deadline: deadline('2026-12-01'),
    openingTime: opening('2026-11-10'),
  },
];

const HOMEWORK_TASKS: TaskSeed[] = [
  {
    id: 'readme',
    title: 'README по правилам',
    key: 'readme',
    maxGrade: 5,
    statement:
      'Напишите README для своего репозитория: что это, как запустить, как проверить.',
    annotation: '',
    attachments: [],
    patterns: ['README.md'],
    deadline: deadline('2026-09-22'),
    openingTime: opening('2026-09-01'),
  },
  {
    id: 'http',
    title: 'HTTP вручную',
    key: 'http',
    maxGrade: 5,
    statement:
      'Отправьте через curl запросы GET, POST и PUT к учебному API и объясните каждый заголовок ответа.',
    annotation: '',
    attachments: [],
    patterns: ['http/**'],
    deadline: deadline('2026-10-06'),
    openingTime: opening('2026-09-22'),
  },
  {
    id: 'sql',
    title: 'SQL-запросы',
    key: 'sql',
    maxGrade: 5,
    statement: 'Решите 8 задач на SELECT и JOIN.',
    annotation: '',
    attachments: [{ name: 'schema.sql', size: '6 КБ' }],
    patterns: ['sql/*.sql'],
    deadline: deadline('2026-10-13'),
    openingTime: opening('2026-09-29'),
  },
  {
    id: 'k8s-bonus',
    title: 'Дополнительно: Kubernetes',
    key: 'k8s-bonus',
    maxGrade: 5,
    statement:
      'По желанию: перенесите приложение в учебный кластер Kubernetes и опишите манифесты.',
    annotation: 'Необязательное задание.',
    attachments: [],
    patterns: [],
    deadline: { kind: 'none' },
    openingTime: opening('2026-11-17'),
  },
];

const PROJECT_TASKS: TaskSeed[] = [
  {
    id: 'spec',
    title: 'Курсовой проект: техническое задание',
    key: 'spec',
    maxGrade: 20,
    statement:
      'Опишите задачу проекта, пользователей, сценарии и нефункциональные требования по шаблону.',
    annotation: '',
    attachments: [{ name: 'Шаблон ТЗ.docx', size: '40 КБ' }],
    patterns: ['docs/spec.md'],
    deadline: deadline('2026-10-20'),
    openingTime: null,
  },
  {
    id: 'prototype',
    title: 'Курсовой проект: прототип',
    key: 'prototype',
    maxGrade: 20,
    statement: 'Покажите кликабельный прототип основных сценариев.',
    annotation: '',
    attachments: [],
    patterns: ['docs/prototype/**'],
    deadline: deadline('2026-11-10'),
    openingTime: null,
  },
  {
    id: 'mvp',
    title: 'Курсовой проект: MVP',
    key: 'mvp',
    maxGrade: 30,
    statement:
      'Работающая версия с основными сценариями, развёрнутая на стенде.',
    annotation: '',
    attachments: [],
    patterns: ['src/**', 'docs/**'],
    deadline: deadline('2026-12-08'),
    openingTime: null,
  },
  {
    id: 'defense',
    title: 'Курсовой проект: защита',
    key: 'defense',
    maxGrade: 30,
    statement: 'Презентация на 7 минут и ответы на вопросы.',
    annotation: '',
    attachments: [],
    patterns: ['docs/defense.pdf'],
    deadline: deadline('2026-12-22'),
    openingTime: null,
  },
];

const GROUP_SEEDS = [
  {
    id: 'tg-labs',
    title: 'Лабораторные',
    key: 'labs',
    template: {
      state: 'ready',
      commit: '3f2a91c',
      message: 'Каркас лабораторных',
      at: at('2026-08-28T14:10:00'),
    },
    tasks: LAB_TASKS,
  },
  {
    id: 'tg-homework',
    title: 'Домашние',
    key: 'homework',
    template: { state: 'empty' },
    tasks: HOMEWORK_TASKS,
  },
  {
    id: 'tg-project',
    title: 'Курсовой проект',
    key: 'project',
    template: {
      state: 'ready',
      commit: '9b41d07',
      message: 'Шаблон проекта: docs/, src/',
      at: at('2026-08-30T11:42:00'),
    },
    tasks: PROJECT_TASKS,
  },
] satisfies Array<Omit<TaskGroup, 'taskIds'> & { tasks: TaskSeed[] }>;

export const TASK_GROUPS: TaskGroup[] = GROUP_SEEDS.map(
  ({ tasks, ...group }) => ({
    ...group,
    taskIds: tasks.map((task) => task.id),
  })
);

const SEEDS = GROUP_SEEDS.flatMap((group) =>
  group.tasks.map((task) => ({ ...task, groupId: group.id }))
);

export const TASKS: Record<string, Task> = Object.fromEntries(
  SEEDS.map((seed) => [
    seed.id,
    {
      id: seed.id,
      title: seed.title,
      key: seed.key,
      groupId: seed.groupId,
      maxGrade: seed.maxGrade,
      statement: seed.statement,
      annotation: seed.annotation,
      attachments: seed.attachments,
      patterns: seed.patterns,
      version: 3,
    },
  ])
);

const LAB_DAY_REASON = 'Лабораторные у подгруппы по четвергам';

const GROUP_OVERRIDES: DeadlineOverride[] = [
  ...['branching', 'http', 'docker'].flatMap((taskId) =>
    ['g151-2', 'g111-2'].map((groupId) => ({
      taskId,
      target: { kind: 'group', groupId } as const,
      value:
        taskId === 'branching'
          ? deadline('2026-10-01')
          : taskId === 'http'
            ? deadline('2026-10-08')
            : deadline('2026-10-29'),
      reason: LAB_DAY_REASON,
    }))
  ),
  {
    taskId: 'docker',
    target: { kind: 'group', groupId: 'g111-1' },
    value: deadline('2026-11-05'),
    reason: '4 ноября — праздник, занятие перенесено',
  },
  {
    taskId: 'sql',
    target: { kind: 'group', groupId: 'g111-1' },
    value: deadline('2026-10-13'),
    reason: 'Зафиксировано: общий дедлайн могут перенести',
  },
  {
    taskId: 'deploy',
    target: { kind: 'group', groupId: 'g111-2' },
    value: { kind: 'none' },
    reason: 'Тема не читалась у подгруппы, сдача по желанию',
  },
  {
    taskId: 'k8s-bonus',
    target: { kind: 'group', groupId: 'g151-1' },
    value: deadline('2026-12-15'),
    reason: 'Обязательно для углублённого трека',
  },
];

const personal = (
  taskId: string,
  studentIndex: number,
  value: DeadlineOverride['value'],
  reason: string
): DeadlineOverride => ({
  taskId,
  target: { kind: 'student', studentId: `s${studentIndex}` },
  value,
  reason,
});

const PERSONAL_OVERRIDES: DeadlineOverride[] = [
  personal(
    'http',
    13,
    deadline('2026-10-06'),
    'Сдаёт вместе с 151-1пп по личной договорённости'
  ),
  personal('branching', 3, deadline('2026-10-06'), 'Болезнь, справка до 03.10'),
  personal('readme', 27, { kind: 'none' }, 'Академический отпуск до 01.12'),
  personal(
    'docker',
    40,
    deadline('2026-11-03'),
    'Олимпиада ICPC, сборы 20–26.10'
  ),
  personal(
    'sql',
    30,
    deadline('2026-10-20'),
    'Перевёлся из другого вуза, догоняет программу'
  ),
  personal('ci', 18, deadline('2026-11-10'), 'Спортивные сборы'),
  personal('spec', 45, deadline('2026-10-27'), ''),
  personal('git-basics', 7, deadline('2026-09-22'), 'Добавлен в курс 16.09'),
];

export const SCHEDULE: Schedule = {
  tasks: Object.fromEntries(
    SEEDS.map((task) => [
      task.id,
      { deadline: task.deadline, openingTime: task.openingTime },
    ])
  ),
  overrides: [...GROUP_OVERRIDES, ...PERSONAL_OVERRIDES],
};

// Deterministic «random» submissions around each deadline, so a shift of a
// couple of days flips the late status of some Attempts.
function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
}

const HOUR = 60 * 60 * 1000;

export const ATTEMPTS: Attempt[] = SEEDS.flatMap((task, taskIndex) => {
  if (task.deadline.kind === 'none') {
    return [];
  }

  const taskDeadline = task.deadline.at;

  return STUDENTS.flatMap((student, studentIndex) => {
    const roll = pseudoRandom(taskIndex * 101 + studentIndex * 7);

    if (roll < 0.12) {
      return [];
    }

    const offset = Math.round((pseudoRandom(roll * 1000) * 130 - 90) * HOUR);
    const submittedAt = taskDeadline + offset;

    if (submittedAt > NOW) {
      return [];
    }

    return [
      {
        id: `${task.id}:${student.id}`,
        taskId: task.id,
        studentId: student.id,
        submittedAt,
      },
    ];
  });
});

// ---------------------------------------------------------------------------
// Scenario world for «Применение правок Task» (#181)

export const OWN_DRAFT_PAGE_EDITS = [
  'Абзац «Добро пожаловать…» переписан',
  'Новый раздел «Полезные ссылки» в конце страницы',
  'Исправлен заголовок модуля «Веб-платформы»',
];

export const STALE_DRAFT_PUBLISHED_AT = at('2026-10-13T11:05:00');
export const LEASE_TAKEN_AT = at('2026-10-13T11:40:00');

// ---------------------------------------------------------------------------
// Course Page with Task References in the middle of a long document

let nodeSequence = 0;
const nodeId = () => `proto-node-${(nodeSequence += 1)}`;
let rankSequence = 0;
const nextRank = () => `p${String((rankSequence += 1)).padStart(3, '0')}`;

function text(value: string) {
  return [{ id: nodeId(), type: 'text' as const, text: value }];
}

function heading(level: 2 | 3, value: string): CourseContentBlockItem {
  return {
    id: nodeId(),
    rank: nextRank(),
    type: 'heading',
    level,
    children: text(value),
  };
}

function paragraph(value: string): CourseContentBlockItem {
  return {
    id: nodeId(),
    rank: nextRank(),
    type: 'paragraph',
    children: text(value),
  };
}

function list(items: string[]): CourseContentBlockItem {
  return {
    id: nodeId(),
    rank: nextRank(),
    type: 'list',
    items: items.map((item, index) => ({
      id: nodeId(),
      rank: `b${index}`,
      variant: 'unordered',
      children: text(item),
    })),
  };
}

function reference(taskId: string): CourseContentBlockItem {
  return { id: `ref-${taskId}`, rank: nextRank(), type: 'assignment', taskId };
}

export const PAGE_TASK_ORDER = [
  'git-basics',
  'branching',
  'readme',
  'http',
  'sql',
  'spec',
  'docker',
  'ci',
  'compose',
  'deploy',
  'k8s-bonus',
  'prototype',
  'mvp',
  'defense',
];

export function buildPrototypeCoursePage(): {
  content: CourseContentBlockItem[];
  resources: CoursePageResources;
} {
  nodeSequence = 0;
  rankSequence = 0;

  const content: CourseContentBlockItem[] = [
    heading(2, 'О курсе'),
    paragraph(
      'Курс знакомит с тем, как сегодня разрабатывают и доставляют программы: от командной работы в Git до контейнеров и облака. Каждый модуль заканчивается практикой в вашем репозитории.'
    ),
    list([
      'Лабораторные сдаются в один репозиторий «Лабораторные», по каталогу на работу.',
      'Домашние задания короче и проверяются автоматически.',
      'Курсовой проект идёт параллельно с модулями 2–4.',
    ]),
    paragraph(
      'Дедлайны указаны в карточках заданий. Если у вашей подгруппы занятие в другой день, дедлайн в карточке уже учитывает это.'
    ),
    heading(2, 'Модуль 1. Командная разработка'),
    paragraph(
      'Git — основной инструмент курса: через него вы получаете шаблоны и сдаёте работы. В этом модуле разберём коммиты, ветки и ревью.'
    ),
    paragraph(
      'Перед первой лабораторной установите Git и настройте SSH-ключ по инструкции из раздела «Файлы».'
    ),
    reference('git-basics'),
    paragraph(
      'Вторая лабораторная продолжает первую: работа ведётся в том же репозитории, в новом каталоге.'
    ),
    reference('branching'),
    heading(3, 'Документация проекта'),
    paragraph(
      'Хороший README экономит часы тем, кто будет запускать ваш код, включая проверяющего.'
    ),
    reference('readme'),
    heading(2, 'Модуль 2. Веб-платформы'),
    paragraph(
      'Как браузер разговаривает с сервером: HTTP, REST, базы данных. В конце модуля у вас будет небольшое веб-приложение, которое пригодится в модуле 3.'
    ),
    list([
      'HTTP-методы, коды ответов и заголовки.',
      'Проектирование REST API.',
      'Реляционные базы данных и SQL.',
    ]),
    reference('http'),
    paragraph(
      'Для задач по SQL используйте учебную базу: схема приложена к заданию, данные загружаются скриптом из шаблона.'
    ),
    reference('sql'),
    heading(3, 'Старт курсового проекта'),
    paragraph(
      'Темы проектов согласуйте с преподавателем до конца сентября. Первый этап — техническое задание.'
    ),
    reference('spec'),
    heading(2, 'Модуль 3. Облачная инфраструктура'),
    paragraph(
      'Контейнеры, автоматические проверки и доставка в облако. Сначала упакуем приложение в образ, затем настроим конвейер, который его проверяет.'
    ),
    paragraph(
      'Лабораторные этого модуля опираются друг на друга. Если вы пропустили лабораторную про Docker-образ, начните с неё: конвейер CI собирает именно этот образ.'
    ),
    reference('docker'),
    paragraph(
      'После того как образ собирается, автоматизируем проверки: каждый push запускает линтер, тесты и сборку образа.'
    ),
    reference('ci'),
    paragraph(
      'Приложению нужна база данных. Docker Compose поднимает всё окружение одной командой.'
    ),
    reference('compose'),
    heading(3, 'Доставка'),
    paragraph(
      'Учебный стенд выдаётся на подгруппу. Доступы придут на почту за неделю до лабораторной.'
    ),
    reference('deploy'),
    paragraph(
      'Для тех, кому интересно глубже: оркестрация контейнеров в Kubernetes.'
    ),
    reference('k8s-bonus'),
    heading(2, 'Курсовой проект'),
    paragraph(
      'Проект сдаётся в четыре этапа. Каждый этап проверяется отдельно, итоговая оценка — сумма этапов.'
    ),
    reference('prototype'),
    reference('mvp'),
    paragraph(
      'Защиты проходят на последней неделе семестра, расписание появится в начале декабря.'
    ),
    reference('defense'),
    heading(2, 'Оценивание'),
    paragraph(
      'Лабораторные — 60 баллов, домашние — 20, курсовой проект — 100. Опоздание не снижает балл, но отмечается в журнале.'
    ),
  ];

  return {
    content,
    resources: {
      images: [],
      files: [],
      assignments: SEEDS.map((task) => ({
        taskId: task.id,
        title: task.title,
        dueDate:
          task.deadline.kind === 'at'
            ? new Date(task.deadline.at).toISOString()
            : undefined,
        maxScore: task.maxGrade ?? undefined,
      })),
    },
  };
}

/** Course Page order of the fixture, for «Порядок Task» checks. */
export function pageOrderIndex(taskId: string) {
  const index = PAGE_TASK_ORDER.indexOf(taskId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
