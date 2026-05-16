// Temporary route label stubs used until task/student/course detail APIs
// provide real display data. Remove these functions when real data is wired.

export function getStubTaskTitle(taskId: string) {
  return `Лабораторная работа ${taskId}`;
}

export function getStubStudentName(username: string) {
  return username;
}

export function getStubCourseTitle(courseSlug: string) {
  return courseSlug;
}
