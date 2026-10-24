import { describe, expect, it } from 'vitest';
import { nextDeniedLocation } from './resource-denial';

const PAGE = '/courses/algorithms/tasks/1/attempts/sasha/1';
const COURSE = '/courses/algorithms';

describe('the denied location of the Course shell', () => {
  it('starts at the location whose read was denied', () => {
    expect(nextDeniedLocation(null, { href: PAGE, observedDenial: true })).toBe(
      PAGE
    );
  });

  it('holds after the replaced page stops observing the read', () => {
    expect(
      nextDeniedLocation(PAGE, { href: PAGE, observedDenial: false })
    ).toBe(PAGE);
  });

  it('ends when the location changes', () => {
    expect(
      nextDeniedLocation(PAGE, { href: COURSE, observedDenial: false })
    ).toBeNull();
  });

  it('moves to a new location whose read is denied too', () => {
    expect(
      nextDeniedLocation(PAGE, { href: COURSE, observedDenial: true })
    ).toBe(COURSE);
  });

  it('stays absent while no read is denied', () => {
    expect(
      nextDeniedLocation(null, { href: PAGE, observedDenial: false })
    ).toBeNull();
  });
});
