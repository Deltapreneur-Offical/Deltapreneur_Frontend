import useCurrency from '../../context/CurrencyContext';
import { useTranslation } from 'react-i18next';

export default function DomainRegistrationPriceBreakdown({ pricing, className = '' }) {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();

  if (!pricing) return null;

  const { subtotal, gst, total, gstRate, gstEnabled, years } = pricing;

  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-gray-600">
        <span>
          {t('storefrontPriceSubtotal')}
          {years > 1 ? (
            <span className="text-gray-400 ml-1">
              ({years} {years === 1 ? t('storefrontYear') : t('storefrontYears')})
            </span>
          ) : null}
        </span>
        <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
      </div>
      {gstEnabled && gst > 0 ? (
        <div className="flex justify-between text-sm text-gray-600">
          <span>{t('storefrontPriceGst', { rate: gstRate ?? 18 })}</span>
          <span className="font-medium text-gray-900">{formatPrice(gst)}</span>
        </div>
      ) : null}
      <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-bold text-gray-900">
        <span>{t('storefrontPriceTotal')}</span>
        <span>{formatPrice(total)}</span>
      </div>
      {gstEnabled ? (
        <p className="text-xs text-gray-500 pt-1">{t('storefrontPriceGstNote')}</p>
      ) : null}
    </div>
  );
}
