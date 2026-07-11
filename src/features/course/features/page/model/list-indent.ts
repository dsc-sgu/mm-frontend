const MIN_COURSE_LIST_INDENT = 1;

export function normalizeCourseListIndent(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return MIN_COURSE_LIST_INDENT;
  }

  return Math.max(MIN_COURSE_LIST_INDENT, Math.round(value));
}

export function serializeCourseListIndent(value: unknown) {
  const indent = normalizeCourseListIndent(value);

  return indent > MIN_COURSE_LIST_INDENT ? indent : undefined;
}
