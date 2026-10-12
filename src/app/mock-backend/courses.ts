import * as v from 'valibot';
import type { MockCourse } from '@/app/mock-backend/state';
import { UsernameSchema } from '@/features/auth/model/identity';
import {
  CourseIdSchema,
  CourseSlugSchema,
} from '@/features/course/model/identity';

export const seededCourses: MockCourse[] = [
  {
    id: v.parse(CourseIdSchema, '10000000-0000-4000-8000-000000000001'),
    slug: v.parse(CourseSlugSchema, 'algorithms-and-data-structures'),
    accessState: 'open',
    title: 'Алгоритмы и структуры данных',
    shortTitle: 'АиСД',
    color: 'teal',
    iconName: 'code-xml',
    teachers: [
      {
        lastName: 'Батраева',
        firstName: 'Инна',
        patronymic: 'Александровна',
        username: v.parse(UsernameSchema, 'inna_batraeva'),
      },
      {
        lastName: 'Сафрончик',
        firstName: 'Мария',
        patronymic: 'Ильинична',
        username: v.parse(UsernameSchema, 'maria_safronchik'),
      },
    ],
  },
  {
    id: v.parse(CourseIdSchema, '10000000-0000-4000-8000-000000000002'),
    slug: v.parse(CourseSlugSchema, 'databases'),
    accessState: 'open',
    title: 'Базы данных',
    shortTitle: 'БД',
    color: 'blue',
    iconName: 'database',
    teachers: [
      {
        lastName: 'Ковалев',
        firstName: 'Павел',
        patronymic: 'Сергеевич',
        username: v.parse(UsernameSchema, 'pavel_kovalev'),
      },
    ],
  },
  {
    id: v.parse(CourseIdSchema, '10000000-0000-4000-8000-000000000003'),
    slug: v.parse(CourseSlugSchema, 'programming-languages'),
    accessState: 'open',
    title: 'Языки программирования',
    shortTitle: 'ЯП',
    color: 'red',
    iconName: 'braces',
    teachers: [
      {
        lastName: 'Левченко',
        firstName: 'Анна',
        patronymic: 'Владимировна',
        username: v.parse(UsernameSchema, 'anna_levchenko'),
      },
      {
        lastName: 'Титов',
        firstName: 'Егор',
        patronymic: 'Романович',
        username: v.parse(UsernameSchema, 'egor_titov'),
      },
    ],
  },
  {
    id: v.parse(CourseIdSchema, '10000000-0000-4000-8000-000000000004'),
    slug: v.parse(CourseSlugSchema, 'frontend-engineering'),
    accessState: 'open',
    title: 'Фронтенд',
    shortTitle: 'Фронтенд',
    color: 'orange',
    iconName: 'monitor-smartphone',
    teachers: [
      {
        lastName: 'Громова',
        firstName: 'Елизавета',
        patronymic: 'Павловна',
        username: v.parse(UsernameSchema, 'elizaveta_gromova'),
      },
    ],
  },
  {
    id: v.parse(CourseIdSchema, '10000000-0000-4000-8000-000000000005'),
    slug: v.parse(CourseSlugSchema, 'operating-systems'),
    accessState: 'open',
    title: 'Операционные системы',
    shortTitle: 'ОС',
    color: 'violet',
    iconName: 'cpu',
    teachers: [
      {
        lastName: 'Морозов',
        firstName: 'Андрей',
        patronymic: 'Николаевич',
        username: v.parse(UsernameSchema, 'andrey_morozov'),
      },
    ],
  },
  {
    id: v.parse(CourseIdSchema, '10000000-0000-4000-8000-000000000006'),
    slug: v.parse(CourseSlugSchema, 'computer-networks'),
    accessState: 'open',
    title: 'Компьютерные сети',
    shortTitle: 'КС',
    color: 'pink',
    iconName: 'network',
    teachers: [
      {
        lastName: 'Семенова',
        firstName: 'Дарья',
        patronymic: 'Олеговна',
        username: v.parse(UsernameSchema, 'daria_semenova'),
      },
    ],
  },
  {
    id: v.parse(CourseIdSchema, '10000000-0000-4000-8000-000000000007'),
    slug: v.parse(CourseSlugSchema, 'modern-information-technologies'),
    accessState: 'open',
    title: 'Современные информационные технологии',
    shortTitle: 'СИТ',
    color: 'green',
    iconName: 'rocket',
    teachers: [
      {
        lastName: 'Архипов',
        firstName: 'Иван',
        patronymic: 'Сергеевич',
        username: v.parse(UsernameSchema, 'gohy279'),
      },
      {
        lastName: 'Кудяков',
        firstName: 'Артём',
        patronymic: 'Александрович',
        username: v.parse(UsernameSchema, 't3m8ch'),
      },
    ],
  },
];
