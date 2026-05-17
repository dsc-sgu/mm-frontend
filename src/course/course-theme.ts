import type { CourseColor } from './course.types';

export type CourseColorTheme = {
  base: string;
  darkBase: string;
  icon: string;
  darkIcon: string;
  border: string;
  accent: string;
};

export const COURSE_COLOR_THEMES: Record<CourseColor, CourseColorTheme> = {
  blue: {
    base: 'from-blue-100 to-blue-200',
    darkBase: 'dark:from-blue-950 dark:to-blue-900',
    icon: 'text-blue-700/25',
    darkIcon: 'dark:text-blue-300/15',
    border: 'border-blue-300/60 dark:border-blue-800/60',
    accent: 'text-blue-700 dark:text-blue-300',
  },
  teal: {
    base: 'from-teal-100 to-teal-200',
    darkBase: 'dark:from-teal-950 dark:to-teal-900',
    icon: 'text-teal-700/25',
    darkIcon: 'dark:text-teal-300/15',
    border: 'border-teal-300/60 dark:border-teal-800/60',
    accent: 'text-teal-700 dark:text-teal-300',
  },
  violet: {
    base: 'from-violet-100 to-violet-200',
    darkBase: 'dark:from-violet-950 dark:to-violet-900',
    icon: 'text-violet-700/25',
    darkIcon: 'dark:text-violet-300/15',
    border: 'border-violet-300/60 dark:border-violet-800/60',
    accent: 'text-violet-700 dark:text-violet-300',
  },
  pink: {
    base: 'from-pink-100 to-pink-200',
    darkBase: 'dark:from-pink-950 dark:to-pink-900',
    icon: 'text-pink-700/25',
    darkIcon: 'dark:text-pink-300/15',
    border: 'border-pink-300/60 dark:border-pink-800/60',
    accent: 'text-pink-700 dark:text-pink-300',
  },
  red: {
    base: 'from-red-100 to-red-200',
    darkBase: 'dark:from-red-950 dark:to-red-900',
    icon: 'text-red-700/25',
    darkIcon: 'dark:text-red-300/15',
    border: 'border-red-300/60 dark:border-red-800/60',
    accent: 'text-red-700 dark:text-red-300',
  },
  orange: {
    base: 'from-orange-100 to-orange-200',
    darkBase: 'dark:from-orange-950 dark:to-orange-900',
    icon: 'text-orange-700/25',
    darkIcon: 'dark:text-orange-300/15',
    border: 'border-orange-300/60 dark:border-orange-800/60',
    accent: 'text-orange-700 dark:text-orange-300',
  },
  green: {
    base: 'from-green-100 to-green-200',
    darkBase: 'dark:from-green-950 dark:to-green-900',
    icon: 'text-green-800/25',
    darkIcon: 'dark:text-green-300/15',
    border: 'border-green-300/60 dark:border-green-800/60',
    accent: 'text-green-700 dark:text-green-300',
  },
};
