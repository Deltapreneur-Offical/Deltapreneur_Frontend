import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  FileCheck,
  Link2,
  Loader2,
  Lock,
  Package,
  Receipt,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { useVirtualAssistantCatalog } from '../../hooks/useVirtualAssistantCatalog';
import { useOperationsServicesCatalog } from '../../hooks/useOperationsServicesCatalog';
import { buildCartItemBreakdown, buildCartOrderViewModel } from '../../utils/cartLineBreakdown';
import { getCartProductMeta } from '../../utils/cartProductMeta';
import { OPERATIONS_ICON_MAP } from '../../utils/operationsIcons';
import vaProfileIcon from '../../assets/Cobrother_Profile.png';
import CartInfoTooltip, { SERVICE_FOLLOW_UP_TOOLTIP, VA_FOLLOW_UP_TOOLTIP } from './CartInfoTooltip';

function AnimatedAmount({ value, formatPrice, className = '' }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`tabular-nums ${className}`}
      >
        {formatPrice(value)}
      </motion.span>
    </AnimatePresence>
  );
}

function VaProfileIcon({ size = 'card' }) {
  const sizeClass = size === 'header' ? 'w-9 h-9 p-2' : 'w-11 h-11 p-2.5';
  return (
    <div
      className={`${sizeClass} shrink-0 flex items-center justify-center rounded-xl bg-gray-100 border border-gray-200/90 shadow-sm`}
      aria-hidden
    >
      <img
        src={vaProfileIcon}
        alt=""
        className="w-full h-full object-contain object-center"
        draggable={false}
      />
    </div>
  );
}

function SectionHeader({
  accent,
  icon: Icon,
  useVaIcon,
  title,
  subtitle,
  count,
  expanded,
  collapsible,
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
      <div className="flex items-start gap-2.5 min-w-0">
        {useVaIcon ? (
          <VaProfileIcon size="header" />
        ) : (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <Icon size={15} strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <h4 className="text-[13px] font-semibold text-gray-900 leading-tight">{title}</h4>
          {subtitle && (
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {typeof count === 'number' && (
          <span className="text-[11px] font-semibold tabular-nums text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
        {collapsible && (
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </div>
    </div>
  );
}

function CollapsibleFollowUpSection({
  accent,
  icon,
  useVaIcon,
  title,
  subtitle,
  tooltip,
  tooltipLabel,
  count,
  defaultOpen = true,
  children,
}) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="flex items-start gap-1 px-3.5 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-start text-left hover:opacity-90 transition-opacity min-w-0"
          aria-expanded={expanded}
        >
          <SectionHeader
            accent={accent}
            icon={icon}
            useVaIcon={useVaIcon}
            title={title}
            subtitle={subtitle}
            count={count}
            expanded={expanded}
            collapsible
          />
        </button>
        {tooltip && (
          <div className="pt-1 shrink-0">
            <CartInfoTooltip text={tooltip} ariaLabel={tooltipLabel} maxWidth={320} />
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-0 space-y-2 border-t border-gray-50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function IconBadge({ iconKey, accent, tint, IconOverride, useVaIcon, size = 'md' }) {
  if (useVaIcon) {
    return <VaProfileIcon size={size === 'sm' ? 'header' : 'card'} />;
  }

  const dim = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-11 h-11 rounded-xl';
  const Icon = IconOverride || OPERATIONS_ICON_MAP[iconKey] || FileCheck;

  return (
    <div
      className={`${dim} flex items-center justify-center shrink-0`}
      style={{ backgroundColor: tint || `${accent}12`, color: accent }}
    >
      <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />
    </div>
  );
}

function formatEstimatedPrice(price, formatPrice, t, { monthly = false } = {}) {
  if (!price || price <= 0) return t('onRequest', { defaultValue: 'On request' });
  return `${formatPrice(price)}${monthly ? t('monthSuffix', { defaultValue: '/mo' }) : ''}`;
}

function ProductRow({ product, formatPrice, t }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getCartProductMeta(product.productType);
  const metaLabel = t(meta.labelKey, { defaultValue: meta.label });
  const ProductIcon = meta.icon;
  const hasBreakdown = product.coBrotherFee > 0 || product.addonAmount > 0 || product.basePrice !== product.amount;

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <button
        type="button"
        disabled={!hasBreakdown}
        onClick={() => hasBreakdown && setExpanded((v) => !v)}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          hasBreakdown ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
        }`}
        aria-expanded={hasBreakdown ? expanded : undefined}
      >
        <IconBadge
          IconOverride={ProductIcon}
          accent={meta.accent}
          tint={meta.tint}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-900 truncate" translate="no">{product.name}</p>
          <p className="text-[10px] font-medium mt-0.5" style={{ color: meta.accent }}>
            {product.planLabel
              || (product.productType === 'DOMAIN_REGISTRATION' && product.periodYears
                ? t('cartDomainRegistrationPeriod', {
                  defaultValue: '{{label}} - {{count}} yr',
                  label: metaLabel,
                  count: product.periodYears,
                })
                : metaLabel)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[13px] font-semibold text-gray-900 tabular-nums">
            {formatPrice(product.amount)}
          </span>
          {hasBreakdown && (
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && hasBreakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-gray-50/90 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">{t('basePrice', { defaultValue: 'Base price' })}</span>
                <span className="text-gray-700 tabular-nums font-medium">{formatPrice(product.basePrice)}</span>
              </div>
              {product.coBrotherFee > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">{t('coCreator', { defaultValue: 'Co-Deltapreneur' })}</span>
                  <span className="text-gray-700 tabular-nums font-medium">{formatPrice(product.coBrotherFee)}</span>
                </div>
              )}
              {product.addonAmount > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">{t('services', { defaultValue: 'Services' })}</span>
                  <span className="text-gray-700 tabular-nums font-medium">{formatPrice(product.addonAmount)}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RequestCard({
  label,
  productName,
  priceLabel,
  tooltip,
  description,
  iconKey,
  accent,
  tint,
  monthly = false,
  useVaIcon = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const pricePrefix = priceLabel === t('onRequest', { defaultValue: 'On request' }) ? '' : t('fromPricePrefix', { defaultValue: 'From ' });

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/30 overflow-hidden">
      <div className="w-full flex gap-3 p-3 hover:bg-white/80 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex gap-3 text-left min-w-0"
          aria-expanded={expanded}
        >
          <IconBadge
            iconKey={iconKey}
            accent={accent}
            tint={tint}
            useVaIcon={useVaIcon}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-gray-900 leading-snug pr-1">{label}</p>
              <div className="text-right shrink-0">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{t('estimateShort', { defaultValue: 'Est.' })}</p>
                <p className="text-[13px] font-semibold text-gray-900 tabular-nums leading-tight">
                  {pricePrefix}{priceLabel}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center gap-1 max-w-full rounded-full bg-white border border-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                  <Link2 size={10} className="shrink-0 text-gray-400" />
                  <span className="truncate" translate="no">{productName}</span>
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: `${accent}10`, color: accent }}
                >
                  {t('followUpRequired', { defaultValue: 'Follow-up required' })}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 shrink-0">
                {expanded ? t('hideDetails', { defaultValue: 'Hide details' }) : t('viewDetails', { defaultValue: 'View details' })}
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                />
              </span>
            </div>
          </div>
        </button>
        {tooltip && (
          <div className="pt-0.5 shrink-0 self-start">
            <CartInfoTooltip text={tooltip} ariaLabel={`About ${label}`} maxWidth={320} />
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-gray-50">
              <div className="mt-2.5 rounded-lg bg-gray-50/80 px-3 py-2.5 space-y-2 text-[11px] text-gray-600 leading-relaxed">
                {description ? (
                  <p>{description}</p>
                ) : (
                  <p className="text-gray-500">{t('cartFollowUpDefaultDesc', { defaultValue: 'Our team will contact you after purchase with full details.' })}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gray-200/60">
                  <span><span className="text-gray-400">{t('linkedProductPrefix', { defaultValue: 'Linked product - ' })}</span><span translate="no">{productName}</span></span>
                  <span>
                    <span className="text-gray-400">{t('estimatePrefix', { defaultValue: 'Estimate - ' })}</span>
                    {pricePrefix}{priceLabel}{monthly && priceLabel !== t('onRequest', { defaultValue: 'On request' }) ? t('monthlyParenthetical', { defaultValue: ' (monthly)' }) : ''}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TotalsPanel({
  orderView,
  formatPrice,
  showEdgePointsRow,
  edgePointsApplying,
  hasEdgePointsDiscount,
  edgePointsDiscount,
  edgePointsUsed,
  payable,
}) {
  const { t } = useTranslation();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const breakdownId = 'cart-pay-today-breakdown';

  return (
    <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/90 to-white p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      {(showEdgePointsRow || (!edgePointsApplying && edgePointsUsed > 0)) && (
      <div className="space-y-2.5">
        {showEdgePointsRow && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-emerald-700">Edge Points</span>
            <span className="text-[13px] font-semibold text-emerald-700 tabular-nums">
              {edgePointsApplying ? (
                <Loader2 size={13} className="animate-spin inline" />
              ) : hasEdgePointsDiscount ? (
                `−${formatPrice(edgePointsDiscount)}`
              ) : (
                formatPrice(0)
              )}
            </span>
          </div>
        )}
        {!edgePointsApplying && edgePointsUsed > 0 && (
          <p className="text-[10px] text-emerald-600 text-right -mt-1">{t('cartPointsRedeemed', { defaultValue: '{{count}} pts redeemed', count: edgePointsUsed })}</p>
        )}
      </div>
      )}

      <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 overflow-hidden">
        <button
          type="button"
          onClick={() => setBreakdownOpen((open) => !open)}
          aria-expanded={breakdownOpen}
          aria-controls={breakdownId}
          className="w-full px-4 py-3.5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-inset"
        >
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">{t('payToday', { defaultValue: 'Pay today' })}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{t('includingApplicableTaxes', { defaultValue: 'Including applicable taxes' })}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <p className="font-display text-xl font-bold text-emerald-900 tabular-nums">
              {edgePointsApplying ? (
                formatPrice(orderView.productTotal)
              ) : (
                <AnimatedAmount value={payable} formatPrice={formatPrice} />
              )}
            </p>
            <ChevronDown
              size={16}
              className={`text-emerald-700/70 transition-transform duration-200 ${breakdownOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </div>
        </button>
        <AnimatePresence initial={false}>
          {breakdownOpen && (
            <motion.div
              id={breakdownId}
              key="pay-today-breakdown"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3.5 pt-0 space-y-2 border-t border-emerald-100/90">
                <div className="flex items-center justify-between gap-3 pt-3">
                  <span className="text-[12px] text-gray-600">{t('products', { defaultValue: 'Products' })}</span>
                  <span className="text-[12px] font-semibold text-gray-900 tabular-nums">
                    {formatPrice(orderView.productSubtotal)}
                  </span>
                </div>
                {!orderView.hideGstSplit && orderView.productGst > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-gray-600">
                    GST{orderView.gstRate != null ? ` (${orderView.gstRate}%)` : ' (18%)'}
                  </span>
                  <span className="text-[12px] font-semibold text-gray-900 tabular-nums">
                    {formatPrice(orderView.productGst)}
                  </span>
                </div>
                ) : orderView.hideGstSplit ? (
                <p className="text-[11px] text-gray-500 pt-1">{t('inclusiveTaxes', { defaultValue: 'Inclusive of applicable taxes' })}</p>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CartSummary({
  cart,
  onCheckout,
  loading,
  edgePointsDiscount = 0,
  edgePointsApplying = false,
  edgePointsUsed = 0,
  finalPayable,
  redeemActive = false,
  productTotal,
  checkoutDisabled = false,
  checkoutLabel,
  secureNote,
}) {
  const { t } = useTranslation();
  const { formatPrice, formatDomainPrice } = useCurrency();
  const hasDomainRegistration = useMemo(
    () => (cart?.items || []).some((it) => it.productType === 'DOMAIN_REGISTRATION'),
    [cart?.items],
  );
  const money = hasDomainRegistration ? formatDomainPrice : formatPrice;
  const { services: vaServices } = useVirtualAssistantCatalog();
  const { priceByAddonKey } = useOperationsServicesCatalog();

  const orderView = useMemo(() => {
    const breakdowns = (cart?.items || []).map((item) =>
      buildCartItemBreakdown(item, vaServices, priceByAddonKey),
    );
    return buildCartOrderViewModel(breakdowns);
  }, [cart?.items, vaServices, priceByAddonKey]);

  if (!cart || !cart.items?.length) return null;

  const payable = finalPayable ?? productTotal ?? orderView.productTotal;
  const hasEdgePointsDiscount = redeemActive && edgePointsDiscount > 0;
  const showEdgePointsRow = redeemActive || edgePointsApplying;
  const followUpCount = orderView.services.length + orderView.virtualAssistants.length;

  return (
    <div className="rounded-[18px] border border-gray-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col max-h-[calc(100vh-7rem)]">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white via-gray-50/30 to-white shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0 shadow-sm">
              <Receipt size={18} className="text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-gray-900 tracking-tight">{t('orderSummary', { defaultValue: 'Order Summary' })}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t('cartSummaryDueToday', { defaultValue: '{{count}} product due today', count: orderView.products.length })}
                {followUpCount > 0 && t('cartSummaryFollowUpsSuffix', { defaultValue: ' - {{count}} follow-up request', count: followUpCount })}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 sm:px-2.5 sm:py-1 sm:text-[11px]">
            <Lock size={10} className="shrink-0 sm:w-[11px] sm:h-[11px]" strokeWidth={2} aria-hidden />
            <span className="whitespace-nowrap">{t('secureCheckout', { defaultValue: 'Secure checkout' })}</span>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-5 min-h-0">
        <section>
          <div className="mb-2.5">
            <SectionHeader
              accent="#111827"
              icon={Package}
              title={t('products', { defaultValue: 'Products' })}
              subtitle={t('cartProductsSubtitle', { defaultValue: 'Paid today - included in checkout' })}
              count={orderView.products.length}
            />
          </div>
          <div className="space-y-2">
            {orderView.products.length === 0 ? (
              <p className="text-[12px] text-gray-400 p-4 text-center rounded-2xl border border-gray-100 bg-white">
                {t('cartNoProducts', { defaultValue: 'No products in cart' })}
              </p>
            ) : (
              orderView.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  formatPrice={money}
                  t={t}
                />
              ))
            )}
          </div>
        </section>

        {orderView.services.length > 0 && (
          <CollapsibleFollowUpSection
            accent="#059669"
            icon={FileCheck}
            title={t('cartRequestedServices', { defaultValue: 'Requested Services' })}
            subtitle={t('cartFollowUpSectionSubtitle', { defaultValue: 'Included in checkout total - handled after purchase' })}
            tooltip={SERVICE_FOLLOW_UP_TOOLTIP}
            tooltipLabel={t('aboutRequestedServices', { defaultValue: 'About requested services' })}
            count={orderView.services.length}
          >
            {orderView.services.map((entry) => (
              <RequestCard
                key={entry.id}
                label={entry.label}
                productName={entry.productName}
                priceLabel={formatEstimatedPrice(entry.estimatedPrice, money, t)}
                tooltip={SERVICE_FOLLOW_UP_TOOLTIP}
                description={entry.description}
                iconKey={entry.iconKey}
                accent="#059669"
                tint="#05966914"
              />
            ))}
          </CollapsibleFollowUpSection>
        )}

        {orderView.virtualAssistants.length > 0 && (
          <CollapsibleFollowUpSection
            accent="#6366f1"
            icon={Package}
            useVaIcon
            title={t('navVirtualAssistants', { defaultValue: 'Virtual Assistants' })}
            subtitle={t('cartFollowUpSectionSubtitle', { defaultValue: 'Included in checkout total - handled after purchase' })}
            tooltip={VA_FOLLOW_UP_TOOLTIP}
            tooltipLabel={t('aboutVirtualAssistantRequests', { defaultValue: 'About virtual assistant requests' })}
            count={orderView.virtualAssistants.length}
          >
            {orderView.virtualAssistants.map((entry) => (
              <RequestCard
                key={entry.id}
                label={entry.label}
                productName={entry.productName}
                priceLabel={formatEstimatedPrice(entry.estimatedPrice, money, t, { monthly: true })}
                tooltip={VA_FOLLOW_UP_TOOLTIP}
                description={entry.description}
                accent="#6366f1"
                tint="#6366f114"
                monthly
                useVaIcon
              />
            ))}
          </CollapsibleFollowUpSection>
        )}

        <section>
          <TotalsPanel
            orderView={orderView}
            formatPrice={money}
            showEdgePointsRow={showEdgePointsRow}
            edgePointsApplying={edgePointsApplying}
            hasEdgePointsDiscount={hasEdgePointsDiscount}
            edgePointsDiscount={edgePointsDiscount}
            edgePointsUsed={edgePointsUsed}
            payable={payable}
          />
        </section>
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white/95 backdrop-blur-sm px-5 sm:px-6 py-4 space-y-2.5">
        <button
          type="button"
          onClick={onCheckout}
          disabled={loading || checkoutDisabled || orderView.products.length === 0 || edgePointsApplying}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-emerald-600 bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-800 hover:shadow-md hover:shadow-emerald-900/20 active:translate-y-0 active:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-emerald-600 disabled:hover:shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t('operationsProcessing', { defaultValue: 'Processing...' })}
            </>
          ) : checkoutLabel ? (
            <>
              <FileCheck size={15} />
              {checkoutLabel}
            </>
          ) : (
            <>
              <Lock size={15} />
              {t('payAmount', { defaultValue: 'Pay {{amount}}', amount: money(edgePointsApplying ? orderView.productTotal : payable) })}
            </>
          )}
        </button>
        <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
          <Lock size={10} />
          {secureNote || t('razorpaySecurePayment', { defaultValue: 'Razorpay secure payment' })}
        </p>
      </div>
    </div>
  );
}
