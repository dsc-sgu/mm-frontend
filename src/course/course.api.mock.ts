import type { CourseSummary } from './course.types';

const MOCK_COURSES: CourseSummary[] = [
  {
    courseId: 'algorithms-and-data-structures',
    title: 'Алгоритмы и структуры данных',
    color: 'teal',
    iconName: 'code-xml',
    teachers: [
      {
        lastName: 'Батраева',
        firstName: 'Инна',
        patronymic: 'Александровна',
        username: 'inna_batraeva',
      },
      {
        lastName: 'Сафрончик',
        firstName: 'Мария',
        patronymic: 'Ильинична',
        username: 'maria_safronchik',
      },
    ],
  },
  {
    courseId: 'databases',
    title: 'Базы данных',
    color: 'blue',
    iconName: 'database',
    teachers: [
      {
        lastName: 'Ковалев',
        firstName: 'Павел',
        patronymic: 'Сергеевич',
        username: 'pavel_kovalev',
      },
    ],
  },
  {
    courseId: 'programming-languages',
    title: 'Языки программирования',
    color: 'red',
    iconName: 'braces',
    teachers: [
      {
        lastName: 'Левченко',
        firstName: 'Анна',
        patronymic: 'Владимировна',
        username: 'anna_levchenko',
      },
      {
        lastName: 'Титов',
        firstName: 'Егор',
        patronymic: 'Романович',
        username: 'egor_titov',
      },
    ],
  },
  {
    courseId: 'frontend-engineering',
    title: 'Фронтенд',
    color: 'orange',
    iconName: 'monitor-smartphone',
    teachers: [
      {
        lastName: 'Громова',
        firstName: 'Елизавета',
        patronymic: 'Павловна',
        username: 'elizaveta_gromova',
      },
    ],
  },
  {
    courseId: 'operating-systems',
    title: 'Операционные системы',
    color: 'violet',
    iconName: 'cpu',
    teachers: [
      {
        lastName: 'Морозов',
        firstName: 'Андрей',
        patronymic: 'Николаевич',
        username: 'andrey_morozov',
      },
    ],
  },
  {
    courseId: 'computer-networks',
    title: 'Компьютерные сети',
    color: 'pink',
    iconName: 'network',
    teachers: [
      {
        lastName: 'Семенова',
        firstName: 'Дарья',
        patronymic: 'Олеговна',
        username: 'daria_semenova',
      },
    ],
  },
  {
    courseId: 'modern-information-technologies',
    title: 'Современные информационные технологии',
    color: 'green',
    iconName: 'rocket',
    teachers: [
      {
        lastName: 'Руденко',
        firstName: 'Виктор',
        patronymic: 'Игоревич',
        username: 'viktor_rudenko',
      },
    ],
  },
];

export async function fetchCourses(): Promise<CourseSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 150));

  return MOCK_COURSES;
}
