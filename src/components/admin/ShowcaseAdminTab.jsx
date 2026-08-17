import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminAPI } from '../../api/services';
import useCurrency from '../../context/CurrencyContext';

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

const REASON_LABELS = {
  taken: 'Not available',
  not_premium: 'Not Premium',
  tld_excluded: 'TLD excluded',
  marketplace_listed: 'Already on Marketplace',
  no_price: 'No valid price',
  invalid: 'Invalid',
  below_managed_threshold: 'Below ₹5L managed threshold',
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

function ReasonsList({ reasons }) {
  const rows = Object.entries(reasons || {}).filter(([, n]) => Number(n) > 0);
  if (!rows.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {rows.map(([k, n]) => (
        <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {n} × {REASON_LABELS[k] || k}
        </span>
      ))}
    </div>
  );
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

function newGenerationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `gen-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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
  const [genCount, setGenCount] = useState('50');
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  // Phase B UX state
  const [mode, setMode] = useState('random'); // 'random' | 'keyword'
  const [keyword, setKeyword] = useState('');
  const [genStatus, setGenStatus] = useState(null); // live polled status
  const [lastResult, setLastResult] = useState(null); // final generate summary
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const pollRef = useRef(null);
  const inFlight = useRef(false);

  const notify = (type, msg) => {
    setNotice({ type, msg });
    window.setTimeout(() => setNotice((n) => (n && n.msg === msg ? null : n)), 4500);
  };

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPoll, [stopPoll]);

  const load = useCallback(async (silent) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const params = buildParams(filters, sort, page, pageSize);
      const res = await adminAPI.getShowcaseDomains(params);
      setItems(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setConfig(res.data?.config || null);
      setReadOnly(!!res.data?.readOnly);
      if (!silent) setDraft((d) => d || res.data?.config || null);
    } catch (e) {
      notify('error', e.response?.data?.error || 'Failed to load showcase domains.');
    } finally {
      inFlight.current = false;
      if (!silent) setLoading(false);
    }
  }, [filters, sort, page, pageSize, notify]);

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => items.filter((it) => it.isSelected), [items]);
  const candidates = useMemo(() => items.filter((it) => !it.isSelected), [items]);
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

  const generate = async () => {
    if (readOnly) return;
    setBusy(true);
    setGenStatus(null);
    setLastResult(null);
    stopPoll();
    const gid = newGenerationId();
    try {
      // Send the current form values when actually filled in, so a fresh
      // Generate works even before a Settings save. Empty values are omitted
      // and the backend falls back to the saved config (no wasted OP calls).
      const payload = { count: Number(genCount) || 1, mode, generation_id: gid };
      if (mode === 'keyword') {
        const labels = String(keyword || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (labels.length) payload.seed_labels = labels;
      }
      const tlds = String(draft?.allowed_tlds || '')
        .split(',')
        .map((t) => t.trim().replace(/^\./, ''))
        .filter(Boolean);
      if (tlds.length) payload.allowed_tlds = tlds;

      // Poll live progress while the POST is in flight (async server serves
      // the /status read concurrently). Zero extra OpenProvider calls.
      pollRef.current = setInterval(async () => {
        try {
          const res = await adminAPI.getShowcaseStatus(gid);
          const st = res.data?.status;
          if (st) {
            setGenStatus(st);
            if (st.state === 'complete' || st.state === 'failed') stopPoll();
          }
        } catch (err) {
          // Transient (e.g. request not registered yet) — poll again.
        }
      }, 1200);

      const res = await adminAPI.generateShowcaseCandidates(payload);
      const data = res.data || {};
      setLastResult(data);
      if ((data.candidates_added ?? 0) > 0) {
        notify('success', `${data.candidates_added} candidate(s) found. Tick domains to publish.`);
      } else if (data.message) {
        notify('error', data.message);
      } else {
        notify('error', 'No candidates found.');
      }
      await load(false);
    } catch (e) {
      if (e.response?.status === 409) {
        // Another generation/refresh owns the lock. Tell the admin clearly
        // and still refresh the list — the running generation's results may
        // already be persisted, so they should appear without re-clicking.
        notify(
          'error',
          e.response?.data?.error ||
            'A showcase generation/refresh is already in progress. Try again shortly.'
        );
        await load(true);
      } else {
        notify('error', e.response?.data?.error || 'Generation failed.');
      }
    } finally {
      stopPoll();
      setBusy(false);
    }
  };

  const toggleSelect = async (row, wantSelected) => {
    if (readOnly) return;
    setBusy(true);
    try {
      if (wantSelected) {
        await adminAPI.selectShowcaseDomain(row.id);
        notify('success', `${row.domainName} published to the showcase.`);
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
    setFilters(next);
    setPage(1);
    setTimeout(() => load(false), 0);
  };

  const setF = (patch) => applyFilters({ ...filters, ...patch });

  const running = genStatus?.state === 'running';

  const fmtClock = (sec) => {
    const s = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Read-only preview.</strong> The showcase table is not applied on this database, so
          nothing can be saved here (Generate / Tick / Untick / Refresh / Settings are disabled).
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
        <p className="text-sm text-slate-500">
          Selected domains appear on the Marketplace as OpenProvider Premium cards. Candidates are
          never published until you tick them.
        </p>
      </div>

      {/* ------------------------------------------------- main find/generate */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Find Premium Domains</h3>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode('random')}
            disabled={busy || readOnly}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === 'random'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            } disabled:opacity-50`}
          >
            🔀 Random Premium
          </button>
          <button
            onClick={() => setMode('keyword')}
            disabled={busy || readOnly}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === 'keyword'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            } disabled:opacity-50`}
          >
            Search by keyword
          </button>

          {mode === 'keyword' && (
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Domain keyword / name (e.g. shinebyte)"
              className={`${inputCls} w-56`}
            />
          )}

          <label className="flex flex-col">
            <span className={labelCls}>How many domains?</span>
            <input
              type="number"
              min={1}
              max={100}
              value={genCount}
              onChange={(e) => setGenCount(e.target.value.replace(/^0+(?=\d)/, ''))}
              className={`${inputCls} w-28`}
              placeholder="e.g. 20"
              title="Number of premium candidates to try to find"
            />
          </label>
          <button
            onClick={generate}
            disabled={busy || loading || readOnly}
            title={readOnly ? 'Disabled — read-only preview' : undefined}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Working…' : `Generate ${genCount || 0}`}
          </button>
          <button
            onClick={() => refresh(true)}
            disabled={busy || loading || readOnly}
            title={readOnly ? 'Disabled — read-only preview' : undefined}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {/* live progress */}
        {genStatus && running && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
              <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
              <span className="min-w-0 flex-1">{genStatus.phase || 'Searching OpenProvider...'}</span>
              {(genStatus.elapsedMs ?? 0) > 0 && (
                <span className="shrink-0 text-xs font-normal text-indigo-500">
                  working {fmtClock(genStatus.elapsedMs / 1000)}
                  {genStatus.etaSeconds != null && ` · ~${fmtClock(genStatus.etaSeconds)} left`}
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
              {genStatus.progressPct != null ? (
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(2, genStatus.progressPct))}%` }}
                />
              ) : (
                <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-400" />
              )}
            </div>
            <p className="mt-1.5 text-xs text-indigo-600">
              Candidates found:{' '}
              <span className="font-semibold">{genStatus.candidatesFound ?? 0}</span>
              {genStatus.targetCount ? ` of ${genStatus.targetCount}` : ''}
              {' · '}talking to OpenProvider — checking Premium domains live
            </p>
            <ReasonsList reasons={genStatus.reasons} />
          </div>
        )}

        {/* final result */}
        {lastResult && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              (lastResult.candidates_added ?? 0) > 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <p className="font-semibold">
              {lastResult.mode === 'random' ? 'Random' : 'Keyword'} generation complete —{' '}
              {lastResult.candidates_added ?? 0} candidate(s) found
              {lastResult.skipped_existing ? ` (${lastResult.skipped_existing} already in pool)` : ''}.
            </p>
            {lastResult.shortfall && lastResult.message && (
              <p className="mt-1">{lastResult.message}</p>
            )}
            {!lastResult.shortfall && (
              <p className="mt-1 text-xs opacity-80">
                Review the candidates below and tick the ones you want to publish.
              </p>
            )}
            <ReasonsList reasons={lastResult.reasons} />
          </div>
        )}
      </div>

      {/* ------------------------------------------------- advanced settings */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <button
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className={labelCls}>Public showcase</span>
                <select
                  value={draft?.enabled ? 'true' : 'false'}
                  onChange={(e) =>
                    setDraft({ ...draft, enabled: e.target.value === 'true' })
                  }
                  className={inputCls}
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Allowed TLDs (comma)</span>
                <input
                  value={draft?.allowed_tlds?.join(', ') ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, allowed_tlds: e.target.value.split(',').map((t) => t.trim().replace(/^\./, '')) })
                  }
                  className={inputCls}
                  placeholder="Empty = all TLDs (recommended)"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Leave empty to discover Premium domains across every TLD OpenProvider returns. Enter a comma list (e.g. com, ai, io) to restrict.
                </span>
              </label>
              <label className="block">
                <span className={labelCls}>Keywords (for Search mode)</span>
                <input
                  value={draft?.seed_labels?.join(', ') ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, seed_labels: e.target.value.split(',').map((s) => s.trim()) })
                  }
                  className={inputCls}
                  placeholder="shinebyte, solara"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Saved keywords are used by the background refresh pool.
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Max selected</span>
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
                  <span className={labelCls}>Refresh (hrs)</span>
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

      {/* ------------------------------------------------- glossary */}
      <p className="text-xs text-slate-400">
        <strong>Candidate</strong> = found by the system but not published yet ·{' '}
        <strong>Selected</strong> = you approved it and it appears on the Marketplace.
      </p>

      {/* ------------------------------------------------- selected */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">
            Selected / Active ({selected.length})
          </h3>
          <span className="text-xs text-slate-400">Only these appear publicly</span>
        </div>
        {selected.length === 0 ? (
          <p className="text-sm text-slate-400">No selected domains yet. Tick candidates below to publish.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {selected.map((it) => (
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
            Candidates ({total})
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              {showFilters ? 'Hide filters ▾' : 'Show filters ▸'}
            </button>
            <button
              onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); setTimeout(() => load(false), 0); }}
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
                <select value={sort} onChange={(e) => { setSort(e.target.value); setTimeout(() => load(false), 0); }} className={`${inputCls} w-auto`}>
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
            No candidates yet. Use Generate {genCount || 0} to find OpenProvider Premium domains.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-semibold">Domain</th>
                  <th className="px-3 py-2 font-semibold">TLD</th>
                  <th className="px-3 py-2 font-semibold">Price (1st yr)</th>
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
                    <td className="px-3 py-2.5 font-medium text-slate-900">{it.domainName}</td>
                    <td className="px-3 py-2.5 text-slate-500">.{it.tld}</td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {it.createPriceInr ? formatPrice(it.createPriceInr) : '—'}
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
                onClick={() => { setPage(Math.max(1, page - 1)); setTimeout(() => load(false), 0); }}
                disabled={page <= 1 || loading}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => { setPage(Math.min(pageCount, page + 1)); setTimeout(() => load(false), 0); }}
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
