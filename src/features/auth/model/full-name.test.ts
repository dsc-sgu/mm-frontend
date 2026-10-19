import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import { formatFullName, FullNameSchema } from './full-name';

describe('a Full Name is shown surname first, then given name and patronymic', () => {
  test('all three parts go surname first', () => {
    expect(
      formatFullName({
        lastName: 'Смирнова',
        firstName: 'Анна',
        patronymic: 'Сергеевна',
      })
    ).toBe('Смирнова Анна Сергеевна');
  });

  test('a name without a patronymic has two parts', () => {
    expect(formatFullName({ lastName: 'Кузнецов', firstName: 'Борис' })).toBe(
      'Кузнецов Борис'
    );
  });
});

describe('a patronymic is optional', () => {
  test.each([
    ['an omitted', { lastName: 'Кузнецов', firstName: 'Борис' }],
    ['an empty', { lastName: 'Кузнецов', firstName: 'Борис', patronymic: '' }],
  ])('%s patronymic means none', (_, input) => {
    expect(v.parse(FullNameSchema, input)).toEqual({
      lastName: 'Кузнецов',
      firstName: 'Борис',
    });
  });
});
