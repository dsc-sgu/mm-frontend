import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import {
  addGrades,
  compareGrades,
  formatGrade,
  gradeInputMatches,
  GradeSchema,
  gradesEqual,
  gradeToNumber,
  parseGradeInput,
  type Grade,
} from './grade';

const grade = (value: number): Grade => v.parse(GradeSchema, value);
const maxGrade = grade(10);

function parsedValue(input: string): string | null {
  const result = parseGradeInput(input, maxGrade);
  return result.status === 'valid' ? formatGrade(result.grade) : null;
}

// REV-01
describe('parseGradeInput', () => {
  test.each([
    ['7', '7'],
    ['7,5', '7,5'],
    ['7.5', '7,5'],
    ['7,125', '7,125'],
    ['0', '0'],
    ['10', '10'],
    [' 7,5 ', '7,5'],
  ])('accepts %j as %s', (input, expected) => {
    expect(parsedValue(input)).toBe(expected);
  });

  test.each([
    ['', 'empty'],
    [' ', 'empty'],
    ['-1', 'not-a-number'],
    ['abc', 'not-a-number'],
    ['1e1', 'not-a-number'],
    ['7,', 'not-a-number'],
    ['7,5,1', 'not-a-number'],
    ['7,1255', 'too-precise'],
    ['10,001', 'above-max'],
  ])('rejects %j as %s', (input, error) => {
    expect(parseGradeInput(input, maxGrade)).toEqual({
      status: 'invalid',
      error,
    });
  });

  test('reports extra digits instead of rounding them away', () => {
    expect(parseGradeInput('7,1250', maxGrade)).toEqual({
      status: 'invalid',
      error: 'too-precise',
    });
  });
});

describe('GradeSchema', () => {
  test.each([0, 7, 7.5, 7.125, 25])('accepts %d', (value) => {
    expect(v.is(GradeSchema, value)).toBe(true);
  });

  test.each([-1, 7.1255, Number.NaN, Number.POSITIVE_INFINITY, 1e21, '7'])(
    'rejects %j',
    (value) => {
      expect(v.is(GradeSchema, value)).toBe(false);
    }
  );
});

// REV-02
describe('Grade arithmetic', () => {
  test('adds in whole thousandths', () => {
    expect(gradesEqual(addGrades(grade(0.1), grade(0.2)), grade(0.3))).toBe(
      true
    );
    expect(formatGrade(addGrades(grade(0.1), grade(0.2)))).toBe('0,3');
  });

  test('compares in whole thousandths', () => {
    expect(compareGrades(grade(7.125), grade(7.125))).toBe(0);
    expect(compareGrades(grade(7.124), grade(7.125))).toBeLessThan(0);
    expect(compareGrades(grade(10), grade(9.999))).toBeGreaterThan(0);
  });

  test('maxGrade follows the same precision', () => {
    const preciseMax = grade(7.125);
    expect(parseGradeInput('7,125', preciseMax).status).toBe('valid');
    expect(parseGradeInput('7,126', preciseMax)).toEqual({
      status: 'invalid',
      error: 'above-max',
    });
  });

  test('formats without trailing zeros', () => {
    expect(formatGrade(grade(7.1))).toBe('7,1');
    expect(formatGrade(grade(7.01))).toBe('7,01');
    expect(formatGrade(grade(12))).toBe('12');
  });
});

describe('gradeInputMatches', () => {
  test.each([
    ['7,5', 7.5, true],
    ['7.5', 7.5, true],
    ['7,50', 7.5, true],
    ['7,51', 7.5, false],
    ['', null, true],
    ['', 7.5, false],
    ['7', null, false],
    ['abc', null, false],
  ])('%j against %j is %s', (input, saved, expected) => {
    expect(gradeInputMatches(input, saved === null ? null : grade(saved))).toBe(
      expected
    );
  });
});

test('a Grade round-trips through its JSON number', () => {
  for (const value of [0, 0.001, 7.125, 25]) {
    expect(gradeToNumber(grade(value))).toBe(value);
  }
});
