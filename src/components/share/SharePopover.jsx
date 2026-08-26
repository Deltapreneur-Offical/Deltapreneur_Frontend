import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { sharesAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { formatInr } from '../../utils/money';

/**
 * Pre-written HubRegistrar share message with the CURRENT domain state.
 *
 * `availability` mirrors the share-preview payload shape:
 *   { status: 'available' | 'taken' | 'check_failed' | ..., is_premium: bool, price_inr: number|null }
 * Unknown/missing fields degrade gracefully — the message never invents data.
 */
export function buildShareMessage({ domain, shareUrl, availability }) {
  const a = availability || {};
  const status = a.status;
  const isPremium = Boolean(a.is_premium);
  const isAvailable = status === 'available';
  const priceInr = Number(a.price_inr);
  const price = Number.isFinite(priceInr) && priceInr > 0 ? formatInr(priceInr) : null;

  const details = [];
  if (isPremium) {
    details.push('✦ Premium Domain');
  } else if (isAvailable) {
    details.push('🌐 Standard Domain');
  } else if (status) {
    details.push('🌐 Domain');
  }
  if (isAvailable) {
    details.push('✅ Available');
  } else if (status) {
    details.push('❌ Currently unavailable');
  }
  if (price && isAvailable) {
    details.push(isPremium ? `💰 ${price} (1st Year)` : `💰 ${price}/yr`);
  }

  const lines = [`🚀 Check out ${domain} on HubRegistrar!`];
  if (details.length) lines.push('', ...details);
  lines.push('', `🔗 ${shareUrl}`);
  return lines.join('\n');
}

/**
 * Builds the platform share links for a tokenized /s/{token} share.
 *
 * Composer-prefill support (current official mechanisms):
 *  - WhatsApp (wa.me/?text=), X (x.com/intent/tweet?text=), Telegram
 *    (t.me/share/url?url=&text=), Gmail (mail.google.com su/body) and Email
 *    (mailto: subject/body) support a prefilled message — they get the full
 *    buildShareMessage text with the current domain state.
 *  - Facebook (sharer/sharer.php?u=) shares only the URL: Facebook removed
 *    prefilled composer text support, so the URL alone is passed (the OG card
 *    is fetched by the platform).
 *  - LinkedIn (share-offsite/?url=&title=) attaches only the URL as a link
 *    card; the modern share-offsite API does not prefill composer text.
 */
export function buildSocialLinks(shareUrl, domain, availability) {
  const url = encodeURIComponent(shareUrl);
  const message = buildShareMessage({ domain, shareUrl, availability });
  const text = encodeURIComponent(message);
  const subject = encodeURIComponent(`Check out ${domain} on HubRegistrar!`);
  const body = encodeURIComponent(message);
  return [
    { label: 'WhatsApp', href: `https://wa.me/?text=${text}`, tone: 'bg-emerald-600 hover:bg-emerald-500' },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}`, tone: 'bg-blue-700 hover:bg-blue-600' },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${subject}`, tone: 'bg-sky-800 hover:bg-sky-700' },
    { label: 'X', href: `https://x.com/intent/tweet?text=${text}`, tone: 'bg-slate-900 hover:bg-slate-700' },
    { label: 'Telegram', href: `https://t.me/share/url?url=${url}&text=${text}`, tone: 'bg-sky-500 hover:bg-sky-400' },
    { label: 'Gmail', href: `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, tone: 'bg-red-600 hover:bg-red-500' },
    { label: 'Email', href: `mailto:?subject=${subject}&body=${body}`, tone: 'bg-gray-600 hover:bg-gray-500' },
  ];
}

/**
 * Creates a tokenized share link for a domain result and exposes copy + social
 * share actions. Works for logged-in AND logged-out senders — no login is ever
 * triggered by sharing. A logged-in sender is attributed as the referrer and
 * can earn the existing Edge Points reward; a logged-out sender creates an
 * anonymous share (no referrer, no reward). Login is only required for
 * Add to Cart / Like, which is handled by those buttons.
 */
export default function SharePopover({ shareType, domain, originalQuery, availability, onClose }) {
  const { user } = useAuth();
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCreating(true);
    setError('');
    sharesAPI
      .create({
        share_type: shareType,
        domain,
        original_query: originalQuery,
      })
      .then(({ data }) => {
        if (cancelled) return;
        setShareUrl(data?.data?.share_url || '');
        setCreating(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Never redirect to login — sharing must always work anonymously.
        setError('Could not create the share link right now. Please try again.');
        setCreating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareType, domain, originalQuery]);

  const copyToClipboard = useCallback(async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy the link. Select it manually below.');
    }
  }, [shareUrl]);

  const openSocial = useCallback((href) => {
    if (!href) return;
    // Match the Marketplace share behavior: open the platform's own
    // Share/Post/Compose flow in a sized popup window.
    window.open(href, '_blank', 'width=600,height=400');
  }, []);

  const nativeShare = useCallback(async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: domain || 'HubRegistrar',
          text: buildShareMessage({ domain, shareUrl, availability }),
          url: shareUrl,
        });
      } catch {
        /* user dismissed */
      }
    } else {
      copyToClipboard();
    }
  }, [shareUrl, domain, availability, copyToClipboard]);

  const socials = shareUrl ? buildSocialLinks(shareUrl, domain, availability) : [];

  return (
    <div
      className="w-80 max-w-[calc(100vw-1rem)] max-h-[min(70vh,26rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-xl shadow-gray-900/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-gray-950">Share &amp; Earn</p>
          {user ? (
            <p className="text-xs text-gray-500">
              Earn 20 Edge Points when someone opens your link.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Sign in to earn 20 Edge Points when someone opens your shared link.
              </p>
              <div className="mt-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5">
                <p className="text-[11px] font-medium text-red-600">
                  Note: Rewards are available to active HubRegistrar users only.
                </p>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label="Close share options"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {creating ? (
        <div className="flex items-center gap-2 py-3 text-sm font-semibold text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Creating your share link…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              aria-label="Share link"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-700 outline-none focus:border-sky-300"
            />
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-950 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-700"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {navigator.share ? (
            <button
              type="button"
              onClick={nativeShare}
              className="mt-2.5 w-full rounded-lg border border-sky-200 bg-sky-50 py-2 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-100"
            >
              Share via your device…
            </button>
          ) : null}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {socials.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => openSocial(s.href)}
                className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors ${s.tone}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
