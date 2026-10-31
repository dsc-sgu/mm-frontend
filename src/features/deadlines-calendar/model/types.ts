import type { CourseId } from '@/features/course/model/identity';
import type { CourseColor } from '@/features/course/model/types';

export type Deadline = {
  id: string;
  courseId: CourseId;
  taskId: string;
  courseShortTitle: string;
  taskText: string;
  dueDate: Date;
  courseColor: CourseColor;
};

export type DeadlinesByDay = {
  [date: string]: Deadline[];
};

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
