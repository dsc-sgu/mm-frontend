/** The location whose page a denied read replaced, or `null`. */
export type DeniedLocation = string | null;

/**
 * The denial holds at its location even after the page it replaced unmounts
 * and stops observing the read; leaving the location ends it.
 */
export function nextDeniedLocation(
  current: DeniedLocation,
  { href, observedDenial }: { href: string; observedDenial: boolean }
): DeniedLocation {
  if (observedDenial) {
    return href;
  }
  if (current === href) {
    return current;
  }
  return null;
}
