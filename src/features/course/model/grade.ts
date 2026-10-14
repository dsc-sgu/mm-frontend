import * as v from 'valibot';

declare const gradeBrand: unique symbol;

/**
 * A checked grade with thousandth precision. Stored as whole thousandths so
 * comparison and addition stay exact (0,1 + 0,2 = 0,3).
 */
export type Grade = {
  readonly thousandths: number;
  readonly [gradeBrand]: true;
};

export type GradeInputError =
  | 'empty'
  | 'not-a-number'
  | 'too-precise'
  | 'above-max';

export type GradeInputResult =
  | { status: 'valid'; grade: Grade }
  | { status: 'invalid'; error: GradeInputError };

const GRADE_FRACTION_DIGITS = 3;
const THOUSANDTHS_PER_UNIT = 10 ** GRADE_FRACTION_DIGITS;
const DECIMAL_PATTERN = /^(\d+)(?:[.,](\d+))?$/;

type DecimalParseResult =
  | { status: 'valid'; grade: Grade }
  | { status: 'invalid'; error: Exclude<GradeInputError, 'above-max'> };

function parseDecimal(text: string): DecimalParseResult {
  if (text === '') {
    return { status: 'invalid', error: 'empty' };
  }

  const match = DECIMAL_PATTERN.exec(text);

  if (!match) {
    return { status: 'invalid', error: 'not-a-number' };
  }

  const [, whole, fraction = ''] = match;

  if (fraction.length > GRADE_FRACTION_DIGITS) {
    return { status: 'invalid', error: 'too-precise' };
  }

  const thousandths =
    Number(whole) * THOUSANDTHS_PER_UNIT +
    Number(fraction.padEnd(GRADE_FRACTION_DIGITS, '0'));

  if (!Number.isSafeInteger(thousandths)) {
    return { status: 'invalid', error: 'not-a-number' };
  }

  return { status: 'valid', grade: { thousandths } as Grade };
}

/** Parses a Teacher's input; `,` and `.` both separate the fraction. */
export function parseGradeInput(
  input: string,
  maxGrade: Grade
): GradeInputResult {
  const result = parseDecimal(input.trim());

  if (result.status === 'valid' && compareGrades(result.grade, maxGrade) > 0) {
    return { status: 'invalid', error: 'above-max' };
  }

  return result;
}

/** A Grade or maxGrade carried as a JSON number. */
export const GradeSchema = v.pipe(
  v.number(),
  v.rawTransform(({ dataset, addIssue, NEVER }) => {
    const result = parseDecimal(String(dataset.value));

    if (result.status === 'invalid') {
      addIssue({
        message: `Оценка должна быть неотрицательным числом не более чем с ${GRADE_FRACTION_DIGITS} знаками после запятой.`,
      });
      return NEVER;
    }

    return result.grade;
  })
);

export function compareGrades(first: Grade, second: Grade): number {
  return first.thousandths - second.thousandths;
}

export function gradesEqual(first: Grade, second: Grade): boolean {
  return first.thousandths === second.thousandths;
}

export function addGrades(first: Grade, second: Grade): Grade {
  return { thousandths: first.thousandths + second.thousandths } as Grade;
}

/** Russian decimal notation without trailing zeros: 7,5 */
export function formatGrade(grade: Grade): string {
  const whole = Math.floor(grade.thousandths / THOUSANDTHS_PER_UNIT);
  const fraction = String(grade.thousandths % THOUSANDTHS_PER_UNIT)
    .padStart(GRADE_FRACTION_DIGITS, '0')
    .replace(/0+$/, '');

  return fraction ? `${whole},${fraction}` : String(whole);
}
