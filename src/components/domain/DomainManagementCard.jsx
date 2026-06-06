import { useState } from 'react';
import { ExternalLink, Copy, Check, Globe, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      title={label}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

/**
 * DNS / domain management panel for registered storefront domains.
 * @param {{ domainManagement?: object, compact?: boolean }} props
 */
export default function DomainManagementCard({ domainManagement, compact = false }) {
  const { t } = useTranslation();
  const mgmt = domainManagement;

  if (!mgmt?.available) {
    return null;
  }

  const nameservers = Array.isArray(mgmt.nameservers) ? mgmt.nameservers : [];
  const panelUrl = mgmt.customerPanelUrl;
  const steps = Array.isArray(mgmt.dnsSteps) ? mgmt.dnsSteps : [];
  const nsText = nameservers.join('\n');

  return (
    <section
      id="domain-management"
      className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900">
            {t('domainMgmtTitle', { defaultValue: 'Manage your domain' })}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('domainMgmtSubtitle', {
              defaultValue: 'Add DNS records, point your website, or change nameservers for',
            })}{' '}
            <span className="font-semibold text-gray-900">{mgmt.domain}</span>
          </p>
        </div>
      </div>

      {panelUrl && (
        <div className="flex flex-wrap gap-3">
          <a
            href={panelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow btn-glow-sm inline-flex items-center gap-2 bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
          >
            <ExternalLink className="w-4 h-4" />
            {t('domainMgmtOpenPanel', { defaultValue: 'Open domain management panel' })}
          </a>
          {mgmt.loginEmail && !compact && (
            <p className="text-xs text-gray-500 self-center">
              {t('domainMgmtLoginHint', { defaultValue: 'Sign in with' })}{' '}
              <span className="font-mono text-gray-700">{mgmt.loginEmail}</span>
            </p>
          )}
        </div>
      )}

      {nameservers.length > 0 && (
        <div className="bg-white border border-indigo-100 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Server className="w-4 h-4 text-indigo-600" />
              {t('regOrderNameservers', { defaultValue: 'Nameservers' })}
            </div>
            {nsText && (
              <CopyButton
                text={nsText}
                label={t('domainMgmtCopyNs', { defaultValue: 'Copy all' })}
              />
            )}
          </div>
          <ul className="font-mono text-xs text-gray-800 space-y-1.5">
            {nameservers.map((ns) => (
              <li key={ns} className="flex items-center justify-between gap-2">
                <span className="break-all">{ns}</span>
                <CopyButton text={ns} label={t('domainMgmtCopy', { defaultValue: 'Copy' })} />
              </li>
            ))}
          </ul>
          {!compact && (
            <p className="text-xs text-gray-500 mt-3">
              {t('domainMgmtNsHint', {
                defaultValue:
                  'These nameservers route traffic for your domain. Change them only if you move DNS to another provider.',
              })}
            </p>
          )}
        </div>
      )}

      {!compact && steps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {t('domainMgmtStepsTitle', { defaultValue: 'Quick steps' })}
          </h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-700">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {mgmt.expiresAt && !compact && (
        <p className="text-xs text-gray-500">
          {t('domainMgmtExpiry', { defaultValue: 'Registrar expiry (approx.)' })}:{' '}
          {new Date(mgmt.expiresAt).toLocaleDateString('en-IN')}
        </p>
      )}
    </section>
  );
}
