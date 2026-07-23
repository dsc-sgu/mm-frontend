import { findPhoneNumbersInText } from 'libphonenumber-js/min';
import { find } from 'linkifyjs';

import { findCoursePageInternalLinkCandidates } from '@/features/course/features/page-edit/model/internal-links';

export type CoursePageLinkCandidate = {
  end: number;
  href: string;
  kind: 'email' | 'internal' | 'phone' | 'url';
  start: number;
  value: string;
};

function rangesOverlap(
  left: Pick<CoursePageLinkCandidate, 'end' | 'start'>,
  right: Pick<CoursePageLinkCandidate, 'end' | 'start'>
) {
  return left.start < right.end && right.start < left.end;
}

function uniqueNonOverlappingCandidates(candidates: CoursePageLinkCandidate[]) {
  const accepted: CoursePageLinkCandidate[] = [];
  const seenHrefs = new Set<string>();

  for (const candidate of candidates.sort(
    (left, right) => left.start - right.start || right.end - left.end
  )) {
    if (
      seenHrefs.has(candidate.href) ||
      accepted.some((item) => rangesOverlap(item, candidate))
    ) {
      continue;
    }

    seenHrefs.add(candidate.href);
    accepted.push(candidate);
  }

  return accepted;
}

export function findCoursePageLinkCandidates(
  text: string
): CoursePageLinkCandidate[] {
  const linkifyCandidates = find(text).flatMap(
    (match): CoursePageLinkCandidate[] => {
      if (match.type !== 'email' && match.type !== 'url') {
        return [];
      }

      return [
        {
          end: match.end,
          href: match.href,
          kind: match.type,
          start: match.start,
          value: match.value,
        },
      ];
    }
  );
  const phoneCandidates = findPhoneNumbersInText(text, 'RU').map(
    ({ endsAt, number, startsAt }): CoursePageLinkCandidate => ({
      end: endsAt,
      href: `tel:${number.number}${number.ext ? `;ext=${number.ext}` : ''}`,
      kind: 'phone',
      start: startsAt,
      value: text.slice(startsAt, endsAt),
    })
  );

  return uniqueNonOverlappingCandidates([
    ...linkifyCandidates,
    ...phoneCandidates,
    ...findCoursePageInternalLinkCandidates(text),
  ]);
}

export function normalizeCoursePageLinkInput(
  input: string
): CoursePageLinkCandidate | null {
  const value = input.trim();

  if (value.length === 0) {
    return null;
  }

  if (/^tel:\+\d+(?:;ext=\d+)?$/u.test(value)) {
    return {
      end: value.length,
      href: value,
      kind: 'phone',
      start: 0,
      value,
    };
  }

  const candidates = findCoursePageLinkCandidates(value);
  const exactCandidate = candidates.find(
    (candidate) => candidate.start === 0 && candidate.end === value.length
  );

  if (!exactCandidate) {
    return null;
  }

  return exactCandidate.href.startsWith('mailto:')
    ? { ...exactCandidate, kind: 'email' }
    : exactCandidate;
}
