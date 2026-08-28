import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Share2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { operationsPathForHubRegistrarService } from '../../utils/operationsSections';
import useCurrency from '../../context/CurrencyContext';
import '../../styles/registrations-catalog.css';

export default function HomeRegistrationServiceCard({ categorySlug, service }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const hasPrice = service.price != null && Number(service.price) > 0;
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.origin + operationsPathForHubRegistrarService(categorySlug, service.slug);
    const title = service.label || 'HubRegistrar Service';
    const text = 'Check out ' + title + ' on HubRegistrar!\n\n' + url;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
      return;
    }

    const doCopy = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(url);
      }
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve();
    };

    doCopy()
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        window.prompt('Copy this link:', url);
      });
  }, [categorySlug, service.slug, service.label]);

  return (
    <div className="reg-service-card-wrapper">
      <button type="button" className="reg-service-card__share" onClick={handleShare} aria-label="Share">
        {copied ? <Check size={14} strokeWidth={2.5} /> : <Share2 size={14} strokeWidth={2} />}
      </button>
      <Link
        to={operationsPathForHubRegistrarService(categorySlug, service.slug)}
        className="reg-category-card reg-category-card--service"
        aria-label={`${service.label} Hub Registrar service`}
      >
        <div className="reg-category-card__body">
          <p className="reg-category-card__kicker">{t('regCatalogCardService')}</p>
          <h3 className="reg-category-card__title">{service.label}</h3>
          {hasPrice ? (
            <p className="reg-category-card__price">
              {formatPrice(service.price, { forceDecimals: true })}
            </p>
          ) : (
            <div className="mt-1.5">
              <span className="inline-block rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                {t('operationsContactForPricing', { defaultValue: 'Contact for pricing' })}
              </span>
              {service.governmentFeesApplicable && service.governmentFeeText && (
                <div className="mt-1.5">
                  <span className="inline-block rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    {service.governmentFeeText.replace(/^Government/i, 'Govt.')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="reg-category-card__cta">
          {t('regCatalogCardExplore')}
          <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden />
        </span>
      </Link>
    </div>
  );
}
