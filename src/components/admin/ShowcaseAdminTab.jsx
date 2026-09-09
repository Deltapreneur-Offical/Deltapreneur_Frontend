import { useCallback, useEffect, useRef, useState } from 'react';
import { adminAPI } from '../../api/services';
import useCurrency from '../../context/CurrencyContext';
import {
  buildShowcaseLookupPayload,
  showcaseLookupCardModel,
  showcaseLookupTickDisabled,
} from '../../utils/showcaseAdminLookup';

const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'alphabetical', label: 'A–Z' },
  { id: 'price_asc', label: 'Price: low → high' },
  { id: 'price_desc', label: 'Price: high → low' },
];

const DEFAULT_FILTERS = {
  search: '',
  tlds: '',
  price_min: '',
  price_max: '',
  priceBand: '', // '' | 'under5l' | 'over5l'
  available: '',
  length_min: '',
  length_max: '',
  with_numbers: false,
  with_hyphen: false,
};

function Badge({ children, className = 'bg-indigo-50 text-indigo-800 ring-indigo-200' }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${className}`}>
      {children}
    </span>
  );
}

function SourceBadge({ source }) {
  if (source === 'afternic' || source === 'sedo') {
    return (
      <Badge className="bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200">
        Aftermarket · {source === 'sedo' ? 'Sedo' : 'Afternic'}
      </Badge>
    );
  }
  return null;
}

function buildParams(filters, sort, page, pageSize) {
  const params = {
    page,
    page_size: pageSize,
    sort,
  };
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.tlds.trim()) params.tlds = filters.tlds.trim();
  if (filters.price_min) params.price_min = Number(filters.price_min);
  if (filters.price_max) params.price_max = Number(filters.price_max);
  if (filters.priceBand === 'under5l') params.under_5l = true;
  if (filters.priceBand === 'over5l') params.over_5l = true;
  if (filters.available !== '') params.available = filters.available === 'true';
  if (filters.length_min) params.length_min = Number(filters.length_min);
  if (filters.length_max) params.length_max = Number(filters.length_max);
  if (filters.with_numbers) params.with_numbers = true;
  if (filters.with_hyphen) params.with_hyphen = true;
  return params;
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1';

export default function ShowcaseAdminTab() {
  const { formatPrice } = useCurrency();
  const [config, setConfig] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState([]);
  const [lookupName, setLookupName] = useState('');
  const [lookupTld, setLookupTld] = useState('com');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const inFlight = useRef(false);

  const notify = useCallback((type, msg) => {
    setNotice({ type, msg });
    window.setTimeout(() => setNotice((n) => (n && n.msg === msg ? null : n)), 4500);
  }, []);

  const load = useCallback(async (silent, overrides = {}, isRetry = false) => {
    if (inFlight.current) {
      if (silent && !isRetry) {
        await new Promise((r) => window.setTimeout(r, 150));
        return load(silent, overrides, true);
      }
      return;
    }
    inFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const nextFilters = overrides.filters ?? filters;
      const nextSort = overrides.sort ?? sort;
      const nextPage = overrides.page ?? page;
      const params = buildParams(nextFilters, nextSort, nextPage, pageSize);
      const [poolRes, liveRes] = await Promise.all([
        adminAPI.getShowcaseDomains(params),
        adminAPI.getShowcaseDomains({
          page: 1,
          page_size: 200,
          is_selected: true,
          sort: 'newest',
        }),
      ]);
      setItems(poolRes.data?.items || []);
      setTotal(poolRes.data?.total || 0);
      setSelectedItems(liveRes.data?.items || []);
      setConfig(poolRes.data?.config || null);
      setReadOnly(!!poolRes.data?.readOnly);
      if (!silent) setDraft((d) => d || poolRes.data?.config || null);
    } catch (e) {
      notify('error', e.response?.data?.error || 'Failed to load showcase domains.');
    } finally {
      inFlight.current = false;
      if (!silent) setLoading(false);
    }
  }, [filters, sort, page, pageSize, notify]);

  useEffect(() => {
    load(false);
  }, [load]);

  const liveOnMarketplace = selectedItems;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const refresh = useCallback(async (silent) => {
    if (inFlight.current) return;
    setBusy(true);
    try {
      const res = await adminAPI.refreshShowcase();
      notify(
        'success',
        `Refresh done: ${res.data?.refreshed ?? 0} ok · ${res.data?.removed_unavailable ?? 0} unavailable removed · ${res.data?.hidden_price_failed ?? 0} price-fail hidden.`
      );
      await load(silent);
    } catch (e) {
      notify('error', e.response?.data?.error || 'Refresh failed.');
    } finally {
      setBusy(false);
    }
  }, [load, notify]);

  const backfillRenewals = useCallback(async () => {
    if (inFlight.current || readOnly) return;
    setBusy(true);
    try {
      const res = await adminAPI.backfillShowcaseRenewals();
      notify(
        'success',
        `Renewal prices updated: ${res.data?.backfilled ?? 0} filled · ${res.data?.missing ?? 0} still unavailable.`
      );
      await load(true);
    } catch (e) {
      notify('error', e.response?.data?.error || 'Renewal price refresh failed.');
    } finally {
      setBusy(false);
    }
  }, [load, notify, readOnly]);

  const lookup = async () => {
    if (readOnly || lookupBusy) return;
    const payload = buildShowcaseLookupPayload(lookupName, lookupTld);
    if (payload.error) {
      notify('error', payload.error);
      return;
    }
    setLookupBusy(true);
    setLookupResult(null);
    try {
      const res = await adminAPI.lookupShowcaseDomain(payload);
      const data = res.data || {};
      setLookupResult(data);
      if (data.eligible) {
        notify('success', `${data.live?.domainName || 'Domain'} is ready to Tick.`);
        await load(true);
      } else if (data.message) {
        notify('error', data.message);
      }
    } catch (e) {
      notify('error', e.response?.data?.error || 'Search failed.');
    } finally {
      setLookupBusy(false);
    }
  };

  const toggleSelect = async (row, wantSelected) => {
    if (readOnly) return;
    setBusy(true);
    try {
      if (wantSelected) {
        await adminAPI.selectShowcaseDomain(row.id);
        notify('success', `${row.domainName} published to the showcase.`);
        setLookupResult((prev) => (
          prev?.item?.id === row.id
            ? { ...prev, canSelect: false, alreadySelected: true, item: { ...prev.item, isSelected: true } }
            : prev
        ));
      } else {
        await adminAPI.unselectShowcaseDomain(row.id);
        notify('success', `${row.domainName} unpublished.`);
      }
      await load(true);
    } catch (e) {
      notify('error', e.response?.data?.error || 'Failed to update selection.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (readOnly) return;
    if (!window.confirm(`Remove ${row.domainName} from the showcase pool entirely?`)) return;
    setBusy(true);
    try {
      await adminAPI.removeShowcaseDomain(row.id);
      notify('success', `${row.domainName} removed.`);
      await load(true);
    } catch (e) {
      notify('error', e.response?.data?.error || 'Remove failed.');
    } finally {
      setBusy(false);
    }
  };

  /* ── bulk selection helpers ────────────────────────────────── */
  const toggleRowSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const allIds = items.map((it) => it.id);
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const allVisibleSelected = items.length > 0 && items.every((it) => selectedIds.has(it.id));
  const someVisibleSelected = items.some((it) => selectedIds.has(it.id)) && !allVisibleSelected;

  const bulkTick = async () => {
    if (readOnly || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setBusy(true);
    let ok = 0, fail = 0;
    try {
      for (const id of ids) {
        try {
          await adminAPI.selectShowcaseDomain(id);
          ok++;
        } catch {
          fail++;
        }
      }
      if (fail === 0) notify('success', `${ok} domain(s) published to the showcase.`);
      else notify('warning', `${ok} updated, ${fail} failed.`);
      setSelectedIds(new Set());
      await load(true);
    } finally {
      setBusy(false);
    }
  };

  const bulkRemove = async () => {
    if (readOnly || selectedIds.size === 0) return;
    if (!window.confirm(`Remove ${selectedIds.size} selected domain(s) from the showcase pool entirely?`)) return;
    const ids = [...selectedIds];
    setBusy(true);
    let ok = 0, fail = 0;
    try {
      for (const id of ids) {
        try {
          await adminAPI.removeShowcaseDomain(id);
          ok++;
        } catch {
          fail++;
        }
      }
      if (fail === 0) notify('success', `${ok} domain(s) removed.`);
      else notify('warning', `${ok} removed, ${fail} failed.`);
      setSelectedIds(new Set());
      await load(true);
    } finally {
      setBusy(false);
    }
  };

  const saveConfig = async () => {
    if (!draft || readOnly) return;
    setBusy(true);
    try {
      const res = await adminAPI.updateShowcaseConfig({
        enabled: !!draft.enabled,
        allowed_tlds: String(draft.allowed_tlds || '')
          .split(',')
          .map((t) => t.trim().replace(/^\./, ''))
          .filter(Boolean),
        seed_labels: String(draft.seed_labels || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        max_selected: Number(draft.max_selected) || 50,
        refresh_interval_hours: Number(draft.refresh_interval_hours) || 6,
      });
      setConfig(res.data?.config || null);
      setDraft(res.data?.config || null);
      notify('success', 'Showcase settings saved.');
    } catch (e) {
      notify('error', e.response?.data?.error || 'Failed to save settings.');
    } finally {
      setBusy(false);
    }
  };

  const applyFilters = (next) => {
    setPage(1);
    setFilters(next);
    setSelectedIds(new Set());
  };

  const setF = (patch) => applyFilters({ ...filters, ...patch });

  const lookupCard = showcaseLookupCardModel(lookupResult);
  const lookupTickBlocked = showcaseLookupTickDisabled(lookupResult);

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Read-only preview.</strong> The showcase table is not applied on this database, so
          nothing can be saved here (Search / Tick / Untick / Recheck live cards / Settings are disabled).
          No data has been or can be modified.
        </div>
      )}

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {notice.msg}
        </div>
      )}

      {/* --------------------------------------------------------- header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">OpenProvider Premium Showcase</h2>
        <p className="mt-1 text-sm text-slate-500">
          Look up one premium domain you already found on OpenProvider, then Tick to publish.
          Nothing goes live until you Tick it.
        </p>
        <ol className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
          <li className="rounded-full bg-slate-100 px-3 py-1">1. Search exact domain</li>
          <li className="rounded-full bg-slate-100 px-3 py-1">2. Tick to publish</li>
          <li className="rounded-full bg-slate-100 px-3 py-1">3. Live on Marketplace</li>
        </ol>
      </div>

      {/* ------------------------------------------------- exact-domain lookup */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Search premium domain</h3>
        <p className="mt-1 text-xs text-slate-500">
          Checks only the exact name + TLD you enter. Does not scan other extensions.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <label className="min-w-[12rem] flex-1">
            <span className={labelCls}>Domain name</span>
            <input
              value={lookupName}
              onChange={(e) => setLookupName(e.target.value)}
              placeholder="example"
              className={inputCls}
              autoComplete="off"
            />
          </label>
          <label className="w-32">
            <span className={labelCls}>TLD</span>
            <input
              value={lookupTld}
              onChange={(e) => setLookupTld(e.target.value)}
              placeholder=".com"
              className={inputCls}
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            disabled={lookupBusy || readOnly}
            title={readOnly ? 'Disabled — read-only preview' : undefined}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {lookupBusy ? 'Searching…' : 'Search'}
          </button>
        </form>

        {lookupCard && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-slate-900">{lookupCard.domainName}</p>
                {lookupCard.isPremium ? (
                  <Badge>Premium</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Not premium</Badge>
                )}
                <SourceBadge source={lookupCard.source} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {lookupCard.available ? 'Available' : 'Unavailable'}
                {' · '}
                {lookupCard.createPriceInr ? formatPrice(lookupCard.createPriceInr) : 'No live price'}
                {lookupCard.renewalPriceInr ? ` · renewal ${formatPrice(lookupCard.renewalPriceInr)}` : ''}
              </p>
              {lookupCard.message && !lookupCard.canSelect && (
                <p className="mt-1 text-xs text-amber-800">{lookupCard.message}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {lookupCard.isSelected ? (
                <button
                  type="button"
                  onClick={() => toggleSelect({ id: lookupCard.id, domainName: lookupCard.domainName }, false)}
                  disabled={busy || readOnly || !lookupCard.id}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Untick
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleSelect({ id: lookupCard.id, domainName: lookupCard.domainName }, true)}
                  disabled={busy || readOnly || !lookupCard.canSelect}
                  title={lookupTickBlocked || 'Publish to Marketplace (revalidated live before publishing)'}
                  className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Tick
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------- advanced settings */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <span className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Advanced settings
          </span>
          <span className="text-xs text-slate-400">{showAdvanced ? '▾' : '▸'}</span>
        </button>
        {showAdvanced && config && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <label className="block min-w-0 flex-1">
                  <span className={labelCls}>Keywords</span>
                  <input
                    value={draft?.seed_labels?.join(', ') ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, seed_labels: e.target.value.split(',').map((s) => s.trim()) })
                    }
                    className={inputCls}
                    placeholder="hustler, mint, nova, solara"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, seed_labels: ['hustler', 'mint', 'nova', 'solara'] })}
                  disabled={readOnly}
                  className="mt-5 shrink-0 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                >
                  Use example words
                </button>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
                Optional. Used only by the overnight selected-card refill job, not by Admin Search.
                Save after editing.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className={labelCls}>Show on Marketplace</span>
                <select
                  value={draft?.enabled ? 'true' : 'false'}
                  onChange={(e) =>
                    setDraft({ ...draft, enabled: e.target.value === 'true' })
                  }
                  className={inputCls}
                >
                  <option value="false">Hidden — Ticked names stay in admin only</option>
                  <option value="true">Visible — Ticked names appear as Premium cards</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Limit extensions (optional)</span>
                <input
                  value={draft?.allowed_tlds?.join(', ') ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, allowed_tlds: e.target.value.split(',').map((t) => t.trim().replace(/^\./, '')) })
                  }
                  className={inputCls}
                  placeholder="Leave blank (recommended)"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Optional. Left blank is recommended. Not used by exact-domain Search.
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Max live cards</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={draft?.max_selected ?? 50}
                    onChange={(e) => setDraft({ ...draft, max_selected: Number(e.target.value) })}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Recheck every (hours)</span>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={draft?.refresh_interval_hours ?? 6}
                    onChange={(e) => setDraft({ ...draft, refresh_interval_hours: Number(e.target.value) })}
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={saveConfig}
                disabled={busy || readOnly}
                title={readOnly ? 'Disabled — read-only preview' : undefined}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Save settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------- live on marketplace */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">
            Live on Marketplace ({liveOnMarketplace.length})
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Ticked names — these can appear publicly</span>
            <button
              type="button"
              onClick={() => refresh(true)}
              disabled={busy || lookupBusy || loading || readOnly}
              title="Re-check live Marketplace cards with OpenProvider (prices and availability). Does not find new names."
              className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              Recheck live cards
            </button>
          </div>
        </div>
        {liveOnMarketplace.length === 0 ? (
          <p className="text-sm text-slate-400">None live yet. Tick a row in the pool below to publish.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {liveOnMarketplace.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-900">{it.domainName}</p>
                    <SourceBadge source={it.source} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {it.available ? 'Available' : 'Unavailable'} · {formatPrice(it.createPriceInr ?? 0)}
                    {it.payableInr > 500000 ? ' · Managed acquisition (no online payment)' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => toggleSelect(it, false)}
                    disabled={busy || readOnly}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Untick
                  </button>
                  <button
                    onClick={() => remove(it)}
                    disabled={busy || readOnly}
                    className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------- candidates + filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Inventory pool ({total})
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={backfillRenewals}
              disabled={busy || lookupBusy || loading || readOnly}
              title="Fetch missing renewal prices from OpenProvider without changing price, payable, availability, or checked time."
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
            >
              Refresh renewals
            </button>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              {showFilters ? 'Hide filters ▾' : 'Show filters ▸'}
            </button>
            <button
              onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); setSelectedIds(new Set()); }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Reset filters
            </button>
          </div>
        </div>

        {showFilters && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <input value={filters.search} onChange={(e) => setF({ search: e.target.value })} placeholder="Search domain" className={inputCls} />
              <input value={filters.tlds} onChange={(e) => setF({ tlds: e.target.value })} placeholder="TLDs (com, ai)" className={inputCls} />
              <input type="number" value={filters.price_min} onChange={(e) => setF({ price_min: e.target.value })} placeholder="Min ₹" className={inputCls} />
              <input type="number" value={filters.price_max} onChange={(e) => setF({ price_max: e.target.value })} placeholder="Max ₹" className={inputCls} />
              <select value={filters.priceBand} onChange={(e) => setF({ priceBand: e.target.value })} className={inputCls}>
                <option value="">Any price</option>
                <option value="under5l">Under ₹5L</option>
                <option value="over5l">Over ₹5L</option>
              </select>
              <select value={filters.available} onChange={(e) => setF({ available: e.target.value })} className={inputCls}>
                <option value="">Any status</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
              <input type="number" value={filters.length_min} onChange={(e) => setF({ length_min: e.target.value })} placeholder="Len min" className={inputCls} />
              <input type="number" value={filters.length_max} onChange={(e) => setF({ length_max: e.target.value })} placeholder="Len max" className={inputCls} />
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={filters.with_numbers} onChange={(e) => setF({ with_numbers: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                Contains numbers
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={filters.with_hyphen} onChange={(e) => setF({ with_hyphen: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                Contains hyphen
              </label>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-400">Sort:</span>
                <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); setSelectedIds(new Set()); }} className={`${inputCls} w-auto`}>
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No names in the pool yet. Search an exact premium domain above, then Tick it.
          </p>
        ) : (
          <div className="overflow-x-auto">
            {selectedIds.size > 0 && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-indigo-800">{selectedIds.size} selected</span>
                <button
                  onClick={bulkTick}
                  disabled={busy || readOnly}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Tick Selected
                </button>
                <button
                  onClick={bulkRemove}
                  disabled={busy || readOnly}
                  className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  Remove Selected
                </button>
              </div>
            )}
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                  </th>
                  <th className="px-3 py-2 font-semibold">Domain</th>
                  <th className="px-3 py-2 font-semibold">TLD</th>
                  <th className="px-3 py-2 font-semibold">Price (1st yr)</th>
                  <th className="px-3 py-2 font-semibold">Renewal Price</th>
                  <th className="px-3 py-2 font-semibold">Payable</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Premium</th>
                  <th className="px-3 py-2 font-semibold">Checked</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(it.id)}
                        onChange={() => toggleRowSelect(it.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{it.domainName}</td>
                    <td className="px-3 py-2.5 text-slate-500">.{it.tld}</td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {it.createPriceInr ? formatPrice(it.createPriceInr) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {it.renewalPriceInr ? formatPrice(it.renewalPriceInr) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {it.payableInr ? formatPrice(it.payableInr) : '—'}
                      {it.payableInr > 500000 && (
                        <Badge className="ml-1.5 bg-amber-50 text-amber-800 ring-amber-200">Managed</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {it.available ? (
                        <Badge className="bg-emerald-50 text-emerald-800 ring-emerald-200">Available</Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-800 ring-rose-200">Unavailable</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {it.isPremium ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge className="bg-indigo-50 text-indigo-800 ring-indigo-200">Premium</Badge>
                          <SourceBadge source={it.source} />
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400">
                      {it.lastCheckedAt ? new Date(it.lastCheckedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {it.isSelected ? (
                          <button
                            onClick={() => toggleSelect(it, false)}
                            disabled={busy || readOnly}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Untick
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleSelect(it, true)}
                            disabled={busy || readOnly}
                            title={readOnly ? 'Disabled — read-only preview' : 'Publish to Marketplace (revalidated live before publishing)'}
                            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Tick
                          </button>
                        )}
                        <button
                          onClick={() => remove(it)}
                          disabled={busy || readOnly}
                          className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page {page} of {pageCount} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(Math.min(pageCount, page + 1))}
                disabled={page >= pageCount || loading}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
