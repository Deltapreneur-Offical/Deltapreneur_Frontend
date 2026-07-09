import { useState } from 'react';
import { ExternalLink, Copy, Check, Globe, Server, ChevronRight, Shield, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function CopyButton({ text, label = 'Copy' }) {
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
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
      title={label}
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

const DNS_TABS = ['DNS Records', 'Nameservers', 'Forwarding'];

/**
 * GoDaddy-style DNS / domain management panel for registered storefront domains.
 * @param {{ domainManagement?: object, compact?: boolean }} props
 */
export default function DomainManagementCard({ domainManagement, compact = false }) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState('Nameservers');
  const mgmt = domainManagement;

  if (!mgmt?.available) {
    return null;
  }

  const nameservers = Array.isArray(mgmt.nameservers) ? mgmt.nameservers : [];
  const panelUrl    = mgmt.customerPanelUrl;
  const steps       = Array.isArray(mgmt.dnsSteps) ? mgmt.dnsSteps : [];
  const nsText      = nameservers.join('\n');

  /* ── Compact variant (used in order list cards) ── */
  if (compact) {
    return (
      <section id="domain-management" className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Manage your domain</h2>
            <p className="text-xs text-gray-500">Add DNS records, point your website, or change nameservers for{' '}
              <span className="font-semibold">{mgmt.domain}</span>
            </p>
          </div>
        </div>
        {panelUrl && (
          <div className="px-5 py-3 flex flex-wrap items-center gap-3">
            <a href={panelUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              Open domain management panel
            </a>
            {mgmt.loginEmail && (
              <p className="text-xs text-gray-500">Sign in with <span className="font-mono">{mgmt.loginEmail}</span></p>
            )}
          </div>
        )}
        {nameservers.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Nameservers
              </span>
              <CopyButton text={nsText} label="Copy all" />
            </div>
            <ul className="space-y-1.5">
              {nameservers.map((ns) => (
                <li key={ns} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5">
                  <span className="font-mono text-xs text-gray-800">{ns}</span>
                  <CopyButton text={ns} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  /* ── Full / GoDaddy-style variant ── */
  return (
    <section id="domain-management" className="space-y-4">

      {/* Top action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="inline-block mb-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
            ⚡ COBROTHER AI
          </span>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Connect Your Domain in Minutes</h3>
          <p className="text-xs text-gray-500 mb-3">
            Set up your domain with your website, email, or social media profile faster than ever.
          </p>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            Connect Domain <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Easily verify domain ownership</h3>
          <p className="text-xs text-gray-500 mb-3">
            Need to verify ownership to connect to an external service? We've made it easier than ever.
          </p>
          <button className="text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors">
            Verify Domain Ownership
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Create MX records</h3>
          <p className="text-xs text-gray-500 mb-3">
            Quickly create MX records to connect your domain with email services.
          </p>
          <button className="text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors">
            Create Now
          </button>
        </div>
      </div>

      {/* DNS panel with sub-tabs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">

        {/* Domain selector row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">{mgmt.domain}</span>
          <div className="flex items-center gap-3">
            <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              Domain Settings
            </button>
            {panelUrl && (
              <a href={panelUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-1 rounded-md transition-colors">
                Select a different domain
              </a>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto px-2">
            {DNS_TABS.map((tab) => (
              <button key={tab} type="button" onClick={() => setSubTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  subTab === tab
                    ? 'border-green-500 text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Sub-tab content */}
        <div className="p-6">
          {subTab === 'Nameservers' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Your domain uses the nameservers below. Change them only if you are moving DNS management to another provider.
              </p>
              {nameservers.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-gray-400" /> Nameservers
                    </span>
                    <CopyButton text={nsText} label="Copy all" />
                  </div>
                  <ul className="space-y-2">
                    {nameservers.map((ns) => (
                      <li key={ns} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 gap-2">
                        <span className="font-mono text-sm text-gray-800">{ns}</span>
                        <CopyButton text={ns} />
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 mt-3">
                    These nameservers route traffic for your domain. Change them only if you move DNS to another provider.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Nameserver information not yet available. Check back after registration completes.
                </p>
              )}
            </div>
          )}

          {subTab === 'DNS Records' && (
            <div className="text-center py-10">
              <Server className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">
                DNS records are managed through the OpenProvider control panel.
              </p>
              {panelUrl && (
                <a href={panelUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                  <ExternalLink className="w-4 h-4" /> Manage DNS Records
                </a>
              )}
            </div>
          )}

          {subTab === 'Forwarding' && (
            <div className="text-center py-10">
              <Globe className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">
                Domain forwarding can be configured in the CoBrother domain control panel.
              </p>
              {panelUrl && (
                <a href={panelUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                  <ExternalLink className="w-4 h-4" /> Open Control Panel
                </a>
              )}
            </div>
          )}
        </div>

        {/* Open panel footer */}
        {panelUrl && subTab === 'Nameservers' && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center gap-4">
            <a href={panelUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
              <ExternalLink className="w-4 h-4" /> Open DNS Management Panel
            </a>
            {mgmt.loginEmail && (
              <p className="text-xs text-gray-400">
                Sign in with <span className="font-mono text-gray-600">{mgmt.loginEmail}</span>
              </p>
            )}
          </div>
        )}

      </div>

      {/* Quick steps */}
      {steps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick steps</h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-700">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Expiry */}
      {mgmt.expiresAt && (
        <p className="text-xs text-gray-400 px-1">
          Registrar expiry (approx.): {new Date(mgmt.expiresAt).toLocaleDateString('en-IN')}
        </p>
      )}

    </section>
  );
}
