import type { CourseColor } from '@/course.types';
import type { Deadline, DeadlinesByDay } from './deadlines-calendar.types';

const MOCK_COURSES: { name: string; color: CourseColor }[] = [
  { name: 'Языки программирования', color: 'red' },
  { name: 'Базы данных', color: 'blue' },
  {
    name: 'Современные информационные технологии',
    color: 'green',
  },
  { name: 'Фронтенд', color: 'orange' },
  { name: 'Операционные системы', color: 'violet' },
  { name: 'Алгоритмы и структуры данных', color: 'teal' },
  { name: 'Компьютерные сети', color: 'pink' },
];

const MOCK_TASKS = [
  'Лабораторная работа №1',
  'Лабораторная работа №2',
  'Лабораторная работа №3',
  'Домашнее задание',
  'Курсовой проект',
  'Реферат',
  'Контрольная работа',
  'Оценка лабораторной работы №3',
  'Задание №3',
  'показать +3',
];

function getRandomDeadlineCount(): number {
  const rand = Math.random();
  if (rand < 0.3) return 0;
  if (rand < 0.5) return 1;
  if (rand < 0.7) return 2;
  if (rand < 0.85) return 3;
  if (rand < 0.95) return 4;
  return 5;
}

function generateRandomDeadline(date: Date): Deadline {
  const subject = MOCK_COURSES[Math.floor(Math.random() * MOCK_COURSES.length)];
  const task = MOCK_TASKS[Math.floor(Math.random() * MOCK_TASKS.length)];

  const dueDate = new Date(date);
  const hour = 18 + Math.floor(Math.random() * 5);
  const minute = Math.random() < 0.5 ? 0 : 25;
  dueDate.setHours(hour, minute, 0, 0);

  return {
    id: `${date.toISOString()}-${Math.random().toString(36).slice(2, 11)}`,
    subjectName: subject.name,
    taskText: task,
    dueDate,
    courseColor: subject.color,
  };
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchDeadlines(
  startDate: Date,
  endDate: Date
): Promise<DeadlinesByDay> {
  const delay = 200 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const deadlinesByDay: DeadlinesByDay = {};

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = formatDateKey(currentDate);
    const deadlineCount = getRandomDeadlineCount();

    if (deadlineCount > 0) {
      deadlinesByDay[dateKey] = Array.from({ length: deadlineCount }, () =>
        generateRandomDeadline(new Date(currentDate))
      );
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return deadlinesByDay;
}
