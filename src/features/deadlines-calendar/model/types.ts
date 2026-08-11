import type { CourseColor } from '@/features/course/model/types';

export type Deadline = {
  id: string;
  courseShortTitle: string;
  taskText: string;
  dueDate: Date;
  courseColor: CourseColor;
};

export type DeadlinesByDay = {
  [date: string]: Deadline[];
};

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
