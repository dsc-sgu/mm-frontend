// PROTOTYPE (#181): panel placement shared by every host.
export type PanelLayout = 'overlay' | 'dock';

/** Right padding the document needs so a docked panel does not cover it. */
export function dockPadding(open: boolean, layout: PanelLayout) {
  return open && layout === 'dock' ? 'md:pr-[26rem] xl:pr-[30rem]' : '';
}
