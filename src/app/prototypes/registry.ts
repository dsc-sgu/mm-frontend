// PROTOTYPE: throwaway prototypes the prototype bar can switch on. Lives only
// on prototype/* branches.

export const PROTOTYPES = [
  { id: 'create-course', issue: 277, title: 'Создание курса' },
  { id: 'quick-grading', issue: 121, title: 'Быстрое оценивание' },
  { id: 'task-deadlines', issue: 181, title: 'Задания и дедлайны' },
] as const;

export type PrototypeId = (typeof PROTOTYPES)[number]['id'];

/** The mock Course whose Page is the #181 sandbox fixture. */
export const SANDBOX_COURSE_SLUG = 'modern-information-technologies';
