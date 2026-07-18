/**
 * iPhone / iPod detection (NOT iPad — iPads have a much larger WebKit
 * memory budget and handle the full homepage fine).
 *
 * iPhone Safari enforces the tightest per-tab GPU/memory limits of any
 * supported platform. Heavy homepage work (cloned marquee carousels,
 * forced compositor layers) crashes the tab there while every other
 * platform is unaffected, so a few render paths downgrade gracefully
 * on iPhone only. Windows / Android / Mac / iPad behavior is unchanged.
 */
export const IS_IPHONE =
  typeof navigator !== 'undefined' && /iPhone|iPod/.test(navigator.userAgent);
