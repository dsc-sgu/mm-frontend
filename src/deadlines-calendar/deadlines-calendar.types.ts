import type { CourseColor } from '@/course/course.types';

export type Deadline = {
  id: string;
  subjectName: string;
  taskText: string;
  dueDate: Date;
  courseColor: CourseColor;
};

export type DeadlinesByDay = {
  [date: string]: Deadline[];
};

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
