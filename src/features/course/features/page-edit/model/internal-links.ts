export type CoursePageInternalLinkCandidate = {
  end: number;
  href: string;
  kind: 'internal';
  start: number;
  value: string;
};

const INTERNAL_LINK_PATTERN =
  /(?<![\p{L}\p{N}:/])\/(?!\/)[\p{L}\p{N}._~!$&'()*+,;=:@%+\-/?#]*/gu;
const TRAILING_INTERNAL_LINK_PUNCTUATION = /[),.;!?]+$/u;

export function findCoursePageInternalLinkCandidates(
  text: string
): CoursePageInternalLinkCandidate[] {
  return Array.from(text.matchAll(INTERNAL_LINK_PATTERN)).flatMap((match) => {
    const rawValue = match[0];
    const value = rawValue.replace(TRAILING_INTERNAL_LINK_PUNCTUATION, '');
    const start = match.index;

    if (value.length <= 1 || start === undefined) {
      return [];
    }

    return [
      {
        end: start + value.length,
        href: value,
        kind: 'internal' as const,
        start,
        value,
      },
    ];
  });
}
