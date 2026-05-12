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

type MockCourseAccess = {
  teachers: string[];
  students: string[];
};

const MOCK_COURSE_ACCESS: Record<string, MockCourseAccess> = {
  'algorithms-and-data-structures': {
    teachers: ['inna_batraeva', 'maria_safronchik', 'teacher'],
    students: ['t3m8ch', 'student', 'alice', 'bob', 'ivan-ivanov'],
  },
  databases: {
    teachers: ['pavel_kovalev', 'teacher'],
    students: ['t3m8ch', 'student', 'alice', 'petr-petrov'],
  },
  'programming-languages': {
    teachers: ['anna_levchenko', 'egor_titov', 'teacher'],
    students: ['t3m8ch', 'student', 'bob', 'maria-ivanova'],
  },
  'frontend-engineering': {
    teachers: ['elizaveta_gromova', 'teacher'],
    students: ['t3m8ch', 'student', 'alice', 'frontend-student'],
  },
  'operating-systems': {
    teachers: ['andrey_morozov', 'teacher'],
    students: ['t3m8ch', 'student', 'os-student', 'bob'],
  },
  'computer-networks': {
    teachers: ['daria_semenova', 'teacher'],
    students: ['t3m8ch', 'student', 'network-student', 'alice'],
  },
  'modern-information-technologies': {
    teachers: ['gohy279', 't3m8ch', 'teacher'],
    students: ['student', 'mit-student', 'bob'],
  },
};

export async function fetchCourseAccess({
  courseSlug,
  username,
}: {
  courseSlug: string;
  username: string;
}): Promise<CourseAccessResult> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const course = MOCK_COURSE_ACCESS[courseSlug];
  if (!course) {
    return { status: 'course-not-found', courseSlug, username };
  }

  if (course.teachers.includes(username)) {
    return {
      status: 'allowed',
      courseSlug,
      username,
      role: 'teacher',
      studentUsernames: course.students,
    };
  }

  if (course.students.includes(username)) {
    return {
      status: 'allowed',
      courseSlug,
      username,
      role: 'student',
      studentUsernames: course.students,
    };
  }

  return { status: 'not-course-participant', courseSlug, username };
}
