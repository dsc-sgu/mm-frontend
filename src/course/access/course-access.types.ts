export type CourseRole = 'student' | 'teacher';

export type CourseAccessResult =
  | {
      status: 'allowed';
      courseSlug: string;
      username: string;
      role: CourseRole;
      studentUsernames: string[];
    }
  | { status: 'course-not-found'; courseSlug: string; username: string }
  | { status: 'not-course-participant'; courseSlug: string; username: string };
