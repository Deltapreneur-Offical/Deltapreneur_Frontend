import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Award, HelpCircle, Check, Loader2, Gift, ShoppingBag, Users, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';
import { calculateEdgePointsRedemption } from '../../utils/edgePointsRedemption';

const APPLY_DELAY_MS = 420;
const TOOLTIP_MAX_WIDTH = 300;
const VIEWPORT_PAD = 12;
const TOOLTIP_GAP = 10;

const EARN_WAYS = [
  { icon: Users, label: 'Refer a friend', points: '100 pts' },
  { icon: ShoppingBag, label: 'Complete a purchase', points: '50 pts' },
  { icon: Gift, label: 'List a domain or technology', points: '25 pts' },
  { icon: CalendarDays, label: 'Daily login streak', points: '10 pts' },
];

function EdgePointsHelpTooltip({ open, onClose, onOpen, onScheduleClose, triggerRef }) {
  const tooltipRef = useRef(null);
  const [style, setStyle] = useState(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxWidth = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
    let left = rect.left + rect.width / 2 - maxWidth / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - maxWidth - VIEWPORT_PAD));
    setStyle({
      position: 'fixed',
      top: rect.top - TOOLTIP_GAP,
      left,
      maxWidth,
      width: maxWidth,
      transform: 'translateY(-100%)',
      zIndex: 10050,
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const target = e.target;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open, onClose, triggerRef]);

  if (!open || !style) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      style={style}
      className="pointer-events-auto"
      onMouseEnter={() => {
        updatePosition();
        onOpen();
      }}
      onMouseLeave={onScheduleClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative rounded-xl border border-gray-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.14)] overflow-hidden"
      >
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-50/90 to-white border-b border-gray-100">
          <p className="text-[13px] font-semibold text-gray-900">How to earn Edge Points</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Rewards you can redeem at checkout</p>
        </div>
        <ul className="px-3 py-2.5 space-y-1">
          {EARN_WAYS.map(({ icon: Icon, label, points }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon size={13} strokeWidth={2} />
              </span>
              <span className="flex-1 font-medium">{label}</span>
              <span className="text-[11px] font-semibold text-indigo-700 tabular-nums">{points}</span>
            </li>
          ))}
        </ul>
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-700">Redemption:</span> 10 pts = ₹1 off · max ₹500 per order
        </div>
        <span
          className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 border-r border-b border-gray-200 bg-gray-50"
          aria-hidden="true"
        />
      </motion.div>
    </div>,
    document.body,
  );
}

export default function CartEdgePoints({ orderTotal, onChange }) {
  const [points, setPoints] = useState(0);
  const [worthInr, setWorthInr] = useState(0);
  const [redeem, setRedeem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const helpTriggerRef = useRef(null);
  const tooltipCloseTimerRef = useRef(null);

  const cancelTooltipClose = useCallback(() => {
    if (tooltipCloseTimerRef.current) {
      clearTimeout(tooltipCloseTimerRef.current);
      tooltipCloseTimerRef.current = null;
    }
  }, []);

  const openTooltip = useCallback(() => {
    cancelTooltipClose();
    setShowTooltip(true);
  }, [cancelTooltipClose]);

  const closeTooltip = useCallback(() => {
    cancelTooltipClose();
    setShowTooltip(false);
  }, [cancelTooltipClose]);

  const scheduleTooltipClose = useCallback(() => {
    cancelTooltipClose();
    tooltipCloseTimerRef.current = window.setTimeout(() => setShowTooltip(false), 140);
  }, [cancelTooltipClose]);

  const toggleTooltip = useCallback(() => setShowTooltip((v) => !v), []);

  useEffect(() => () => cancelTooltipClose(), [cancelTooltipClose]);

  useEffect(() => {
    let active = true;
    api.get('/api/v1/edge-points/summary')
      .then(({ data }) => {
        if (active && data?.success) {
          setPoints(data.data.current_points || 0);
          setWorthInr(data.data.worth_inr || 0);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const { discount, finalAmount, pointsUsed } = useMemo(
    () => calculateEdgePointsRedemption(orderTotal, points),
    [orderTotal, points],
  );

  const notify = useCallback((nextRedeem, nextApplying, nextApplied) => {
    onChange({
      redeem: nextRedeem,
      discount: nextRedeem ? discount : 0,
      finalAmount: nextRedeem ? finalAmount : orderTotal,
      applying: nextApplying,
      applied: nextApplied,
      pointsUsed: nextRedeem ? pointsUsed : 0,
    });
  }, [onChange, discount, finalAmount, orderTotal, pointsUsed]);

  useEffect(() => {
    if (!loading && !applying) {
      notify(redeem, false, applied);
    }
  }, [redeem, discount, finalAmount, loading, applying, applied, notify]);

  const handleToggle = async () => {
    if (applying || loading) return;

    if (redeem) {
      setRedeem(false);
      setApplied(false);
      notify(false, false, false);
      return;
    }

    setApplying(true);
    setApplied(false);
    notify(false, true, false);

    await new Promise((resolve) => setTimeout(resolve, APPLY_DELAY_MS));

    setRedeem(true);
    setApplying(false);
    setApplied(true);
    notify(true, false, true);

    window.setTimeout(() => setApplied(false), 2600);
  };

  if (loading) {
    return (
      <div className="rounded-[14px] border border-gray-100 bg-white p-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-100 rounded-full w-36" />
          <div className="h-6 bg-gray-100 rounded-full w-16" />
        </div>
        <div className="h-10 bg-gray-50 rounded-xl mt-4" />
      </div>
    );
  }

  const canRedeem = points > 0 && orderTotal > 0;

  return (
    <div className="rounded-[14px] border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Award size={18} className="text-indigo-600" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-sm font-semibold text-gray-900">Edge Points</span>
              <span ref={helpTriggerRef} className="relative inline-flex">
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1"
                  onMouseEnter={openTooltip}
                  onMouseLeave={scheduleTooltipClose}
                  onFocus={openTooltip}
                  onBlur={closeTooltip}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTooltip();
                  }}
                  aria-label="How to earn Edge Points"
                  aria-expanded={showTooltip}
                >
                  <HelpCircle size={14} />
                </button>
              </span>
              <EdgePointsHelpTooltip
                open={showTooltip}
                onClose={closeTooltip}
                onOpen={openTooltip}
                onScheduleClose={scheduleTooltipClose}
                triggerRef={helpTriggerRef}
              />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {points > 0 ? `Balance worth ₹${worthInr}` : 'Start earning rewards today'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-display text-2xl font-bold text-gray-900 tabular-nums">{points}</span>
          <span className="text-xs text-gray-500 ml-1">pts</span>
        </div>
      </div>

      <div className="px-5 py-4">
        {!canRedeem ? (
          <p className="text-xs text-gray-500 leading-relaxed">
            {points === 0
              ? 'You have 0 Edge Points. Earn by referring friends, completing purchases, or listing on CoBrother.'
              : 'Add items to your cart to redeem Edge Points at checkout.'}
          </p>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleToggle}
              disabled={applying}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                applying
                  ? 'border-indigo-200 bg-indigo-50/50 cursor-wait'
                  : redeem
                    ? 'border-emerald-200 bg-emerald-50/60 hover:border-emerald-300'
                    : 'border-gray-200 bg-gray-50/50 hover:border-indigo-200 hover:bg-indigo-50/30'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 flex-shrink-0 transition-all ${
                applying
                  ? 'border-indigo-300 bg-white'
                  : redeem
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-gray-300 bg-white'
              }`}>
                {applying ? (
                  <Loader2 size={12} className="animate-spin text-indigo-600" />
                ) : redeem ? (
                  <Check size={12} color="#fff" strokeWidth={3} />
                ) : null}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800 block">
                  {applying ? 'Applying Edge Points…' : 'Redeem points on this order'}
                </span>
                <span className="text-xs text-gray-500">
                  Save up to {Math.min(500, worthInr, orderTotal).toFixed(0)} on this checkout
                </span>
              </div>
              {applied && !applying && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"
                >
                  Applied
                </motion.span>
              )}
            </button>

            <AnimatePresence>
              {redeem && discount > 0 && !applying && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-indigo-50/80 border border-indigo-100 px-4 py-3 text-sm space-y-1.5">
                    <div className="flex justify-between text-indigo-800">
                      <span className="font-medium">Points used</span>
                      <span className="font-semibold tabular-nums">{pointsUsed} pts</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Discount</span>
                      <span className="font-semibold text-emerald-700 tabular-nums">−₹{discount}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-indigo-100/80">
                      <span className="font-medium text-gray-800">You pay</span>
                      <span className="font-display font-bold text-gray-900 tabular-nums">₹{finalAmount}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
