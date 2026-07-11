import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function EdgePointsRedeemToggle({ originalAmount, onChange }) {
  const [points, setPoints] = useState(0);
  const [worthInr, setWorthInr] = useState(0);
  const [redeem, setRedeem] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/api/v1/edge-points/summary')
      .then(({ data }) => {
        if (active && data?.success) {
          setPoints(data.data.current_points || 0);
          setWorthInr(data.data.worth_inr || 0);
        }
      })
      .catch((err) => console.error('Failed to load points summary for checkout:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const calculateDiscount = () => {
    if (!redeem || points <= 0 || originalAmount <= 0) {
      return { discount: 0, final: originalAmount };
    }
    // 10 Points = ₹1. Max ₹500 discount (5000 points) per order.
    const maxDiscount = Math.min(500, worthInr, originalAmount);
    const finalAmount = Math.max(0, originalAmount - maxDiscount);
    return { discount: maxDiscount, final: finalAmount };
  };

  const { discount, final } = calculateDiscount();

  const handleToggle = (e) => {
    const newVal = e.target.checked;
    setRedeem(newVal);
  };

  useEffect(() => {
    if (!loading) {
      onChange(redeem, discount, final);
    }
  }, [redeem, discount, final, loading]);

  if (loading) {
    return <div className="text-[12px] text-slate-500 animate-pulse py-2">Loading Edge Points balance...</div>;
  }

  if (points <= 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-4 flex flex-col gap-2">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={redeem}
          onChange={handleToggle}
          className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
        />
        <div className="flex-1">
          <span className="text-[13px] font-bold text-slate-800">Redeem Edge Points</span>
          <span className="text-[11px] text-slate-500 block">
            Available: {points} points (worth ₹{worthInr})
          </span>
        </div>
      </label>
      {redeem && discount > 0 && (
        <div className="text-[12px] bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 mt-1 flex flex-col gap-1">
          <div className="flex justify-between text-indigo-700 font-semibold">
            <span>Points Discount:</span>
            <span>-₹{discount}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Remaining to Pay:</span>
            <span className="font-bold">₹{final}</span>
          </div>
        </div>
      )}
    </div>
  );
}
