import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from 'framer-motion';
import SmallDomainTickerCard from './SmallDomainTickerCard';
import { fetchFeaturedDomainTickerItems } from '../../../utils/featuredDomainTicker';

const CARD_GAP_PX = 12;
const DESKTOP_CARD_WIDTH = 292;
const MOBILE_CARD_WIDTH = 264;
const LOOP_MS = 38000;
const PAUSE_MS = 7200;
const CENTER_TOLERANCE = 24;

function TickerSlot({
  item,
  slotIndex,
  sourceLength,
  x,
  wrapWidth,
  cardWidth,
  focused,
  statusVisible,
  onStatusReveal,
  onSlotExit,
}) {
  const isInViewport = useCallback(
    (currentX) => {
      const left = currentX + slotIndex * (cardWidth + CARD_GAP_PX);
      const right = left + cardWidth;
      return right > 0 && left < wrapWidth;
    },
    [cardWidth, slotIndex, wrapWidth],
  );
  const [inViewport, setInViewport] = useState(() => isInViewport(x.get()));
  const inViewportRef = useRef(inViewport);

  useMotionValueEvent(x, 'change', (currentX) => {
    const nextInViewport = isInViewport(currentX);
    if (nextInViewport !== inViewportRef.current) {
      inViewportRef.current = nextInViewport;
      setInViewport(nextInViewport);
    }
  });

  useEffect(() => {
    if (!inViewport) onSlotExit?.(slotIndex);
  }, [inViewport, onSlotExit, slotIndex]);

  return (
    <motion.div className="shrink-0 transform-gpu will-change-transform" style={{ translateZ: 0 }}>
      <SmallDomainTickerCard
        item={item}
        slotId={slotIndex}
        index={sourceLength ? slotIndex % sourceLength : slotIndex}
        focused={focused}
        statusVisible={statusVisible}
        onStatusReveal={onStatusReveal}
        cardWidth={cardWidth}
      />
    </motion.div>
  );
}

export default function CompactDomainTicker({ className = '' }) {
  const reduceMotion = useReducedMotion();
  const wrapRef = useRef(null);
  const x = useMotionValue(0);
  const [wrapWidth, setWrapWidth] = useState(420);
  const [cardWidth, setCardWidth] = useState(DESKTOP_CARD_WIDTH);
  const [focusedSlot, setFocusedSlot] = useState(null);
  const [revealedSlots, setRevealedSlots] = useState(() => new Set());
  const [sourceItems, setSourceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const focusedSlotRef = useRef(null);
  const pauseUntilRef = useRef(0);
  const armedRef = useRef(true);
  const wrapWidthRef = useRef(wrapWidth);
  const cardWidthRef = useRef(cardWidth);
  const stepRef = useRef(cardWidth + CARD_GAP_PX);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFeaturedDomainTickerItems()
      .then((items) => {
        if (!cancelled) setSourceItems(items);
      })
      .catch(() => {
        if (!cancelled) setSourceItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tickerItems = useMemo(() => {
    if (sourceItems.length === 0) return [];
    return [...sourceItems, ...sourceItems, ...sourceItems];
  }, [sourceItems]);

  const segment = (cardWidth + CARD_GAP_PX) * sourceItems.length;

  wrapWidthRef.current = wrapWidth;
  cardWidthRef.current = cardWidth;
  stepRef.current = cardWidth + CARD_GAP_PX;
  focusedSlotRef.current = focusedSlot;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;

    const updateSize = () => {
      const nextWidth = Math.max(260, el.offsetWidth);
      setWrapWidth(nextWidth);
      setCardWidth(nextWidth < 640 ? MOBILE_CARD_WIDTH : DESKTOP_CARD_WIDTH);
    };

    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    updateSize();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (sourceItems.length === 0) return;
    x.set(-segment);
    setFocusedSlot(null);
    setRevealedSlots(new Set());
    pauseUntilRef.current = 0;
    armedRef.current = true;
  }, [segment, sourceItems.length, x]);

  const onStatusReveal = useCallback((slotIndex) => {
    setRevealedSlots((prev) => {
      if (prev.has(slotIndex)) return prev;
      const next = new Set(prev);
      next.add(slotIndex);
      return next;
    });
  }, []);

  const onSlotExit = useCallback((slotIndex) => {
    setRevealedSlots((prev) => {
      if (!prev.has(slotIndex)) return prev;
      const next = new Set(prev);
      next.delete(slotIndex);
      return next;
    });
  }, []);

  const findCenteredSlot = useCallback((currentX) => {
    const center = wrapWidthRef.current / 2;
    const step = stepRef.current;
    const width = cardWidthRef.current;
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < tickerItems.length; index += 1) {
      const cardCenter = currentX + index * step + width / 2;
      const distance = Math.abs(cardCenter - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    return { bestIndex, bestDistance };
  }, [tickerItems.length]);

  useEffect(() => {
    if (sourceItems.length === 0) return undefined;
    if (reduceMotion) {
      x.set(0);
      return undefined;
    }

    let raf = 0;
    let last = performance.now();
    const pxPerMs = segment / LOOP_MS;

    const tick = (now) => {
      const rawDelta = now - last;
      last = now;
      const dt = Math.min(28, Math.max(4, rawDelta));

      if (now >= pauseUntilRef.current) {
        if (focusedSlotRef.current !== null) setFocusedSlot(null);

        let nextX = x.get() + pxPerMs * dt;
        while (nextX >= 0) nextX -= segment;
        x.set(nextX);

        const { bestIndex, bestDistance } = findCenteredSlot(nextX);
        if (bestDistance > CENTER_TOLERANCE * 2) armedRef.current = true;
        if (armedRef.current && bestIndex >= 0 && bestDistance <= CENTER_TOLERANCE) {
          armedRef.current = false;
          setFocusedSlot(bestIndex);
          pauseUntilRef.current = now + PAUSE_MS;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [findCenteredSlot, reduceMotion, segment, sourceItems.length, x]);

  if (loading || sourceItems.length === 0) {
    return null;
  }

  return (
    <section
      ref={wrapRef}
      className={`domain-ticker-viewport relative flex min-w-0 items-end border-0 bg-transparent ${className}`.trim()}
      aria-label="Featured domain listings"
    >
      <motion.div
        className="domain-ticker-track relative z-0 flex w-max transform-gpu items-end gap-3 py-0 will-change-transform"
        style={{ x, translateZ: 0 }}
      >
        {tickerItems.map((item, index) => (
          <TickerSlot
            key={`${item.id}-${index}`}
            item={item}
            slotIndex={index}
            sourceLength={sourceItems.length}
            x={x}
            wrapWidth={wrapWidth}
            focused={focusedSlot === index}
            statusVisible={revealedSlots.has(index)}
            onStatusReveal={onStatusReveal}
            onSlotExit={onSlotExit}
            cardWidth={cardWidth}
          />
        ))}
      </motion.div>
      <div className="domain-ticker-edge-fade domain-ticker-edge-fade--left" aria-hidden="true" />
      <div className="domain-ticker-edge-fade domain-ticker-edge-fade--right" aria-hidden="true" />
    </section>
  );
}
