import { createContext, useContext } from 'react';

/**
 * True for duplicated (aria-hidden) carousel copies. Cards read this to skip
 * expensive per-instance work — image decoding, countdown timers — that
 * otherwise runs once per clone.
 */
export const CarouselCloneContext = createContext(false);

export function useIsCarouselClone() {
  return useContext(CarouselCloneContext);
}
