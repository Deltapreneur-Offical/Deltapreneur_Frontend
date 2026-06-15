import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatEquityPercent } from '../../constants/ventureLabels';
import {
  getVentureDealAmount,
  isVentureDealBuyer,
  ventureDealCanPay,
} from '../../utils/ventureDeal';

export default function VentureDealRow({ deal, formatPrice, user, onPayNow }) {
  const { t } = useTranslation();
  const isPartnership = deal.dealKind === 'CO_VENTURE';
  const brandName = deal.venture?.brandName || (isPartnership ? 'Partnership deal' : 'Venture deal');
  const statusLabel = (deal.dealStatus || '').replace(/_/g, ' ');
  const amount = getVentureDealAmount(deal);
  const isBuyer = isVentureDealBuyer(deal, user);
  const canPay = ventureDealCanPay(deal, user);
  const equityLabel = deal.venture?.equityPercentOffered != null
    ? `${formatEquityPercent(deal.venture.equityPercentOffered)}% equity`
    : deal.equityPercent != null
      ? `${formatEquityPercent(deal.equityPercent)}% equity`
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded border px-2 py-0.5 text-xs font-bold ${
                isPartnership
                  ? 'border-teal-200 bg-teal-100 text-teal-800'
                  : 'border-violet-200 bg-violet-100 text-violet-800'
              }`}
            >
              ◇ {isPartnership
                ? t('purchasesBadgeCoVenture', { defaultValue: 'Co-Venture' })
                : t('purchasesBadgeVenture', { defaultValue: 'Venture' })}
            </span>
            {canPay && (
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                Payment due
              </span>
            )}
          </div>
          <div className="text-lg font-bold text-gray-900">{brandName}</div>
          <div className="text-xs uppercase tracking-wide text-gray-600">{statusLabel}</div>
          {equityLabel && (
            <div className="mt-0.5 text-xs text-gray-500">{equityLabel}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          {amount > 0 && (
            <div className="font-display text-xl font-bold text-green-600">
              {formatPrice(amount)}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canPay && onPayNow && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                onClick={() => onPayNow(deal)}
              >
                {t('purchasesPayNow', { defaultValue: 'Pay now' })}
              </button>
            )}
            <Link
              to={`/ventures/deals/${deal.id}`}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {t('purchasesViewDeal', { defaultValue: 'View deal' })} →
            </Link>
          </div>
        </div>
      </div>
      {isBuyer && deal.dealStatus === 'PENDING_PAYMENT' && amount > 0 && !canPay && (
        <p className="mt-3 text-xs text-amber-700">
          {t('purchasesVenturePaymentHint', { defaultValue: 'Open the deal to complete payment.' })}
        </p>
      )}
    </div>
  );
}
