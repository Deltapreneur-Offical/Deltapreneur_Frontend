/**
 * Mirrors backend EdgePointsService.calculate_redemption (excluding pending holds).
 * 10 points = ₹1, max ₹500 (5000 points) per order.
 */
export function calculateEdgePointsRedemption(orderAmountInr, availablePoints) {
  const amount = Number(orderAmountInr) || 0;
  const points = Number(availablePoints) || 0;

  if (amount <= 0 || points <= 0) {
    return { discount: 0, finalAmount: amount, pointsUsed: 0 };
  }

  const maxPointsRedeemable = Math.min(5000, points, Math.round(amount * 10));
  const discount = maxPointsRedeemable / 10;
  const finalAmount = Math.max(0, amount - discount);

  return {
    discount: roundMoney(discount),
    finalAmount: roundMoney(finalAmount),
    pointsUsed: maxPointsRedeemable,
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}
