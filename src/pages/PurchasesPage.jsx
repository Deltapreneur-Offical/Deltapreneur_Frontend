import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Globe, Cpu, BadgeCheck, Handshake } from 'lucide-react';
import { domainAPI, domainStorefrontAPI, technologyAPI, domainTransferAPI, ventureDealAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import { generateInvoice } from '../utils/generateInvoice';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { buildOrderCurrencyPayload } from '../utils/currencyDisplay';
import { asArray } from '../utils/asArray';
import { unwrapApiData } from '../utils/apiResponse';
import { extractDomainList } from '../utils/domainApiAdapter';
import {
  isRegistrationPurchase,
  registrationOrderDetailPath,
  registrationStatusBadgeClass,
  registrationStatusLabel,
} from '../utils/domainRegistrationOrder';
import { canManageRegisteredDomain, domainManagementHref } from '../utils/domainManagement';
import VentureDealRow from '../components/venture/VentureDealRow';
import { isVentureDealBuyer } from '../utils/ventureDeal';

const PURCHASES_STAT_ICON = { size: 20, strokeWidth: 2, 'aria-hidden': true };

export default function PurchasesPage() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [domains, setDomains] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [swPurchases, setSwPurchases] = useState([]);
  const [venturePurchases, setVenturePurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [helpModal, setHelpModal] = useState(null);
  const [helpSuccess, setHelpSuccess] = useState(null);
  const [domainTransfers, setDomainTransfers] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      domainAPI.getMyPurchases().catch(() => ({ data: [] })),
      domainStorefrontAPI.listOrders().catch(() => ({ data: [] })),
      technologyAPI.getMyPurchases().catch(() => ({ data: [] })),
      domainTransferAPI.listBuyer().catch(() => ({ data: { items: [] } })),
      ventureDealAPI.getMy().catch(() => ({ data: [] })),
    ]).then(([d, reg, s, transfers, ventureDeals]) => {
      setDomains(extractDomainList(d.data));
      const regList = Array.isArray(reg.data) ? reg.data : reg.data?.data ?? [];
      setRegistrations(regList.filter(isRegistrationPurchase));
      setSwPurchases(asArray(s.data));
      setDomainTransfers(transfers.data?.items || []);
      const deals = asArray(unwrapApiData(ventureDeals.data) || ventureDeals.data);
      setVenturePurchases(
        deals.filter((deal) => isVentureDealBuyer(deal, user))
      );
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const completedDomains = asArray(domains).filter(d =>
    d.paymentStatus === 'COMPLETED' ||
    d.domainStatus === 'SOLD' ||
    d.purchasedByUserId ||
    d.purchased_by_user_id
  );
  const completedRegistrations = asArray(registrations);
  const completedTechnology = asArray(swPurchases).filter(p => p.paymentStatus === 'COMPLETED');
  const ventureItems = asArray(venturePurchases).map((d) => ({ ...d, _type: 'venture' }));
  const domainTabCount = completedDomains.length + completedRegistrations.length + domainTransfers.length;
  const technologyCount = completedTechnology.length;
  const ventureCount = ventureItems.length;
  const totalItems = domainTabCount + technologyCount + ventureCount;

  const domainTabItems = [
    ...domainTransfers.map((tx) => ({ ...tx, _type: 'domain_transfer' })),
    ...completedDomains.map(d => ({ ...d, _type: 'domain' })),
    ...completedRegistrations.map(o => ({ ...o, _type: 'domain_registration' })),
  ];
  const technologyTabItems = completedTechnology.map(p => ({ ...p, _type: 'technology' }));

  const displayItems =
    tab === 'domains' ? domainTabItems
    : tab === 'ventures' ? ventureItems
    : tab === 'technology' ? technologyTabItems
    : [...domainTabItems, ...ventureItems, ...technologyTabItems];

  const purchaseTabs = [
    { id: 'all', label: `${t('purchasesTabAll', { defaultValue: 'All' })} (${totalItems})` },
    { id: 'domains', label: `${t('purchasesTabDomains', { defaultValue: 'Domains' })} (${domainTabCount})` },
    { id: 'ventures', label: `${t('purchasesTabVentures', { defaultValue: 'Ventures' })} (${ventureCount})` },
    { id: 'technology', label: `${t('purchasesTabTechnology', { defaultValue: 'Technology' })} (${technologyCount})` },
  ];

  return (
    <AppLayout>
      <div>
        <div className="mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">
              {t('purchasesTitle', { defaultValue: 'My Purchases' })}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('purchasesSubtitle', {
                defaultValue: 'Domains, ventures, and technology purchases in one place.',
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <StatCard
            label={t('purchasesStatTotal', { defaultValue: 'Total Purchases' })}
            value={totalItems}
            icon={<ShoppingBag {...PURCHASES_STAT_ICON} />}
          />
          <StatCard
            label={t('purchasesStatDomains', { defaultValue: 'Domains' })}
            value={domainTabCount}
            icon={<Globe {...PURCHASES_STAT_ICON} />}
          />
          <StatCard
            label={t('purchasesStatVentures', { defaultValue: 'Ventures' })}
            value={ventureCount}
            icon={<Handshake {...PURCHASES_STAT_ICON} />}
          />
          <StatCard
            label={t('purchasesStatSoftware', { defaultValue: 'Technologies' })}
            value={technologyCount}
            icon={<Cpu {...PURCHASES_STAT_ICON} />}
          />
          <StatCard
            label={t('purchasesStatCoBrotherActive', { defaultValue: 'CoBrother Active' })}
            value={completedTechnology.filter(p => p.coBrotherHelpPaid).length}
            icon={<BadgeCheck {...PURCHASES_STAT_ICON} />}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {purchaseTabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              className={`btn-glow btn-glow-sm ${tab === tabItem.id ? 'bg-gray-900 text-white border-gray-900' : ''}`}
              onClick={() => setTab(tabItem.id)}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                <ShoppingBag size={36} strokeWidth={1.75} aria-hidden />
              </div>
            </div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
              {t('purchasesEmpty', { defaultValue: 'No purchases yet' })}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('purchasesBrowseHint', { defaultValue: 'Browse domains, ventures, and technology to make your first purchase.' })}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button type="button" className="btn-glow btn-glow-sm" onClick={() => navigate('/domains')}>
                {t('browseDomains', { defaultValue: 'Browse Domains' })}
              </button>
              <button type="button" className="btn-glow btn-glow-sm" onClick={() => navigate('/storefront')}>
                {t('storefront', { defaultValue: 'Register a Domain' })}
              </button>
              <button type="button" className="btn-glow btn-glow-sm" onClick={() => navigate('/ventures')}>
                {t('browseVentures', { defaultValue: 'Browse Ventures' })}
              </button>
              <button type="button" className="btn-glow btn-glow-sm" onClick={() => navigate('/technology')}>
                {t('browseTechnology', { defaultValue: 'Browse Technology' })}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {displayItems.map((item) =>
              item._type === 'domain_transfer' ? (
                <Link
                  key={'tx-' + item.id}
                  to={`/purchases/transfers/${item.id}`}
                  className="flex items-center justify-between bg-white border border-indigo-100 rounded-xl px-5 py-4 hover:border-indigo-300"
                >
                  <div>
                    <div className="font-bold text-gray-900">{item.domainFqdn}</div>
                    <div className="text-sm text-gray-500">{item.transferStatus}</div>
                  </div>
                  <span className="text-indigo-600 text-sm font-semibold">
                    {t('purchasesManageTransfer', { defaultValue: 'Manage transfer' })}
                  </span>
                </Link>
              ) : item._type === 'domain_registration' ? (
                <RegistrationPurchaseRow
                  key={'reg-' + item.id}
                  order={item}
                  user={user}
                  t={t}
                />
              ) : item._type === 'venture' ? (
                <VentureDealRow
                  key={'v-' + item.id}
                  deal={item}
                  formatPrice={formatPrice}
                  user={user}
                  onPayNow={(deal) => navigate(`/ventures/deals/${deal.id}`)}
                />
              ) : item._type === 'domain' ? (
                <DomainPurchaseRow
                  key={'d-' + item.id}
                  domain={item}
                  user={user}
                />
              ) : (
                <TechnologyPurchaseRow
                  key={'s-' + item.id}
                  purchase={item}
                  onGetHelp={() => setHelpModal(item)}
                  onDownloadInvoice={() => generateInvoice({ type: 'software', item, user })}
                />
              )
            )}
          </div>
        )}
      </div>

      {helpModal && (
        <CoBrotherHelpModal
          purchase={helpModal}
          onClose={() => setHelpModal(null)}
          onSuccess={(updated) => {
            setSwPurchases(prev => prev.map(p => p.id === updated.id ? updated : p));
            setHelpModal(null);
            setHelpSuccess(updated);
          }}
        />
      )}

      {helpSuccess && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setHelpSuccess(null)}>
          <div className="relative w-full max-w-[440px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] text-center animate-slideUp">
            <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />
            <div className="relative z-10 p-8">
              <div className="text-5xl mb-4">◆</div>
              <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-2">{t('purchasesCoBrotherActivated')}</h2>
              <p className="text-gray-500 mb-5 leading-relaxed">
                {t('purchasesCoBrotherReachOut', {
                  hours: t('purchasesCoBrotherReachOutHours'),
                  name: helpSuccess.software?.name,
                })}
              </p>
              <div className="px-3.5 py-3 bg-green-500/8 border border-green-500/20 rounded-[10px] mb-6 text-xs text-green-400">
                ✓ {t('purchasesCoBrotherPaidSummary', { price: formatPrice(1000) })}
              </div>
              <button type="button" className="btn-glow w-full" onClick={() => setHelpSuccess(null)}>{t('done')}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function DomainPurchaseRow({ domain, user }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-700 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded">
              ◇ {t('purchasesBadgeResale', { defaultValue: 'Resale' })}
            </span>
            {domain.verified && (
              <span className="text-xs font-bold text-green-600">✓ {t('verified', { defaultValue: 'Verified' })}</span>
            )}
          </div>
          <div className="font-bold text-lg text-gray-900">
            {domain.domainName}{domain.domainExtension}
          </div>
          <div className="text-xs text-gray-600">{domain.pricingDemand}</div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="font-display text-xl font-bold text-green-600">
            {formatPrice(domain.askingPrice)}
          </div>
          <InvoiceDownloadButton
            onClick={() => generateInvoice({ type: 'domain', item: domain, user })}
          />
        </div>
      </div>
    </div>
  );
}

function RegistrationPurchaseRow({ order, user, t }) {
  const amount = Number(order.priceInr || 0);
  const badge = registrationStatusBadgeClass(order.status, order.lifecycleStatus);
  const label = registrationStatusLabel(order.status, order.lifecycleStatus, t);

  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
              ◇ {t('purchasesBadgeRegistration', { defaultValue: 'Registration' })}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
          </div>
          <div className="font-bold text-lg text-gray-900">{order.domain}</div>
          <div className="text-xs text-gray-600">
            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : ''}
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="font-display text-xl font-bold text-emerald-700">
            {formatPrice(amount)}
          </div>
          {canManageRegisteredDomain(order) && domainManagementHref(order) ? (
            <a
              href={domainManagementHref(order)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg"
            >
              Manage DNS →
            </a>
          ) : null}
          <Link
            to={registrationOrderDetailPath(order.id)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View order →
          </Link>
          <InvoiceDownloadButton
            onClick={() => generateInvoice({ type: 'domain_registration', item: order, user })}
          />
        </div>
      </div>
    </div>
  );
}

function TechnologyPurchaseRow({ purchase, onGetHelp, onDownloadInvoice }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const sw = purchase.software || {};
  const helpPaid = purchase.coBrotherHelpPaid;
  const confirmed = purchase.completionStatus === 'CONFIRMED';
  const HELP_FEE_INR = 1000;

  const planLabel = purchase.selectedPlan ? {
    'ONE_MONTH': '1 Month Subscription',
    'THREE_MONTHS': '3 Months Subscription',
    'SIX_MONTHS': '6 Months Subscription',
    'TWELVE_MONTHS': '12 Months Subscription',
    'ONE_TIME': 'One-Time Purchase',
  }[purchase.selectedPlan] || purchase.selectedPlan : null;

  const purchaseDate = new Date(purchase.soldAt || purchase.createdAt || Date.now());
  
  let isExpired = false;
  let isExpiringSoon = false;
  
  if (purchase.expiryDate) {
    const expiryDate = new Date(purchase.expiryDate);
    const now = new Date();
    isExpired = expiryDate < now;
    isExpiringSoon = !isExpired && (expiryDate.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }
  
  const formattedExpiry = purchase.expiryDate 
    ? new Date(purchase.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className={`bg-white border rounded-[12px] overflow-hidden transition-all ${confirmed ? 'border-green-200 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
           onClick={() => setExpanded(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-[1rem] flex items-center gap-2 flex-wrap mb-1">
            <span className="truncate">{sw.name || '—'}</span>
            {sw.technologyType === 'HARDWARE' ? (
              <span className="text-[0.65rem] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full tracking-wider">
                HARDWARE
              </span>
            ) : (
              <span className="text-[0.65rem] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full tracking-wider">
                SOFTWARE
              </span>
            )}
            {planLabel && (
              <span className="text-[0.65rem] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md tracking-wider">
                {planLabel}
              </span>
            )}
            {confirmed && (
              <span className="text-[0.65rem] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md tracking-wider">
                ✓ Confirmed
              </span>
            )}
            {isExpired && (
              <span className="text-[0.65rem] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md tracking-wider animate-pulse">
                EXPIRED
              </span>
            )}
            {isExpiringSoon && (
              <span className="text-[0.65rem] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md tracking-wider">
                EXPIRING SOON
              </span>
            )}
            {helpPaid && (
              <span className="text-[0.65rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md tracking-wider">
                ◆ CoBrother
              </span>
            )}
          </div>
          <div className="text-[0.8rem] text-gray-500 font-medium">
            {sw.category?.replace(/_/g, ' ')} <span className="mx-1.5 text-gray-300">•</span> Purchased{' '}
            {purchaseDate.toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
            {formattedExpiry && <><span className="mx-1.5 text-gray-300">•</span> <span className={isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-500'}>Expires: {formattedExpiry}</span></>}
          </div>
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="text-right">
            <div className="font-display text-[1.2rem] font-bold text-purple-700">
              {formatPrice(purchase.grossAmountInr || sw.price || 0)}
            </div>
          </div>
          <span className={`text-gray-400 text-sm transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/30 px-5 py-4">

          {/* Purchased Resources */}
          {confirmed && (
            <div className="mb-5">
              <div className="text-[0.75rem] font-bold text-gray-700 uppercase tracking-wider mb-3">Purchased Resources</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sw.githubLink && (
                  <div className="px-4 py-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-sm hover:border-green-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">🔓</span>
                      <span className="text-[0.85rem] font-semibold text-gray-800">GitHub Repository</span>
                    </div>
                    <a href={sw.githubLink} target="_blank" rel="noreferrer"
                       className="text-sm text-green-600 font-bold no-underline hover:underline bg-green-50 px-3 py-1 rounded-lg">
                      Open →
                    </a>
                  </div>
                )}
                
                {sw.demoUrl && (
                  <div className="px-4 py-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-sm hover:border-indigo-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-500 text-lg">🌐</span>
                      <span className="text-[0.85rem] font-semibold text-gray-800">Demo URL</span>
                    </div>
                    <a href={sw.demoUrl} target="_blank" rel="noreferrer"
                       className="text-sm text-indigo-600 font-bold no-underline hover:underline bg-indigo-50 px-3 py-1 rounded-lg">
                      Open →
                    </a>
                  </div>
                )}
              </div>
              
              {sw.supportingDocuments && sw.supportingDocuments.length > 0 && (
                <div className="mt-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500 text-lg">📄</span>
                    <span className="text-[0.85rem] font-semibold text-gray-800">Supporting Documents</span>
                  </div>
                  <div className="flex flex-col gap-2 pl-7">
                    {sw.supportingDocuments.map((doc, idx) => (
                      <a key={idx} href={doc.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 font-medium hover:underline inline-flex items-center gap-1.5">
                        {doc.name || `Document ${idx + 1}`} <span className="text-xs">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CoBrother status */}
          {helpPaid && (
            <div className="px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl mb-5 text-[0.85rem] text-emerald-800 font-medium shadow-sm flex items-start gap-2">
              <span className="text-emerald-500 text-lg leading-none mt-0.5">◆</span>
              <span>CoBrother assigned — check your email for introduction details.</span>
            </div>
          )}

          {!helpPaid && (
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-between flex-wrap gap-3 mb-5">
              <div>
                <div className="font-bold text-sm text-purple-700 mb-1">{t('purchasesNeedHelpTitle')}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{t('purchasesNeedHelpDesc')}</div>
              </div>
              <button type="button" onClick={onGetHelp} className="btn-glow btn-glow-sm">
                {t('purchasesGetHelp', { price: formatPrice(HELP_FEE_INR) })}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-3">
              <InvoiceDownloadButton onClick={onDownloadInvoice} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceDownloadButton({ onClick }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-all duration-200 bg-white hover:bg-gray-50 group"
    >
      <svg
        className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors"
        viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 1v9m0 0L5 7m3 3 3-3M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {t('invoice')}
    </button>
  );
}

function CoBrotherHelpModal({ purchase, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency, formatPrice } = useCurrency();
  const HELP_FEE_INR = 1000;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sw = purchase.software || {};

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: orderData } = await technologyAPI.payCoBrotherHelp(purchase.id, {
        ...buildOrderCurrencyPayload(currency),
      });
      openRazorpayCheckout({
        orderData,
        user,
        description: `CoBrother Help — ${sw.name}`,
        themeColor: '#7c3aed',
        onSuccess: async (response) => {
          try {
            await technologyAPI.verifyCoBrotherHelp(purchase.id, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess({ ...purchase, coBrotherOptIn: true, coBrotherHelpPaid: true });
          } catch {
            setError(t('storefrontVerifyFailed'));
            setLoading(false);
          }
        },
        onFailure: () => { setError(t('storefrontPaymentFailed')); setLoading(false); },
        onDismiss: () => setLoading(false),
      });
    } catch (err) {
      setError(err.response?.data?.error || t('errorGeneric'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[500px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] text-center animate-slideUp">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />
        <div className="relative z-10 p-8">
          <div className="modal-badge" style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' }}>◆ {t('purchasesCoBrotherHelpBadge')}</div>
          <h2>{sw.name}</h2>
          <p>{t('purchasesCoBrotherHelpDesc')}</p>
        </div>
        <div className="p-8">
          <div className="mb-6">
            {[
              t('purchasesHelpFeature1'),
              t('purchasesHelpFeature2'),
              t('purchasesHelpFeature3'),
              t('purchasesHelpFeature4'),
            ].map((line, i) => (
              <div key={i} className="flex items-center gap-2 mb-3">
                <span className="text-green-600 text-sm">✓</span>
                <span className="text-gray-600 text-sm leading-relaxed">{line}</span>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="text-xs text-gray-600 font-bold uppercase mb-2">{t('purchasesBillingSummary')}</div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 text-sm">{t('purchasesSoftwarePaid')}</span>
              <span className="text-gray-600 text-sm">{formatPrice(sw.price || 0)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 text-sm">{t('purchasesHelperFee')}</span>
              <span className="text-gray-600 text-sm font-bold">{formatPrice(HELP_FEE_INR)}</span>
            </div>
            <div className="h-1 bg-gray-200 mb-2" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900 text-sm">{t('purchasesPayingToday')}</span>
              <span className="font-display text-lg font-bold text-purple-700">{formatPrice(HELP_FEE_INR)}</span>
            </div>
          </div>
          {error && <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-xs text-red-600 mb-6">{error}</div>}
          <div className="flex gap-3">
            <button type="button" className="btn-glow w-full" onClick={handlePay} disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : t('purchasesPayGetHelp', { price: formatPrice(HELP_FEE_INR) })}
            </button>
            <button type="button" className="btn-glow w-full" onClick={onClose}>{t('cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="flex flex-1 min-w-[9.5rem] sm:min-w-[11rem] lg:min-w-[calc(20%-0.75rem)] items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 leading-tight truncate">
          {label}
        </p>
        <p className="mt-1 text-xl sm:text-2xl font-semibold tabular-nums text-slate-900 leading-none tracking-tight">
          {value}
        </p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100">
        {icon}
      </span>
    </div>
  );
}
