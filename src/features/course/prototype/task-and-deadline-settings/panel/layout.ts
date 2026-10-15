// PROTOTYPE (#181): panel placement shared by every host.
export type PanelLayout = 'overlay' | 'dock';

/** Right padding the document needs so a docked panel does not cover it. */
export function dockPadding(open: boolean, layout: PanelLayout) {
  return open && layout === 'dock' ? 'md:pr-[26rem] xl:pr-[30rem]' : '';
}

/**
 * Width taken by a docked panel, as `--prototype-dock-offset`, so fixed bars
 * (apply bar, variant switcher) centre in the space left for the document.
 */
export function dockOffset(open: boolean, layout: PanelLayout) {
  return open && layout === 'dock'
    ? 'md:[--prototype-dock-offset:26rem] xl:[--prototype-dock-offset:30rem]'
    : '';
}

/** `left` of a fixed bar centred in the area not taken by a docked panel. */
export const DOCK_CENTER_LEFT =
  'calc((100% - var(--prototype-dock-offset, 0px)) / 2)';
