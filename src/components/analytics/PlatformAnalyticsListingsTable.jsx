import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BADGE_TYPE_KEYS = new Set(['saleType', 'status', 'category', 'role', 'industry']);
const NUMERIC_KEYS = new Set(['applications', 'views']);

function formatBadgeLabel(value) {
  if (value == null || value === '') return '—';
  return String(value).replace(/_/g, ' ');
}

function getTypeFilterKey(columns) {
  const match = columns.find((column) =>
    ['saleType', 'status', 'category', 'role', 'industry'].includes(column.key),
  );
  return match?.key ?? 'saleType';
}

function TableTypeBadge({ value }) {
  return (
    <span className="pa-listings-badge pa-listings-badge--type">
      {formatBadgeLabel(value)}
    </span>
  );
}

function TableVerifiedBadge({ verified, t }) {
  const isVerified = Boolean(verified);
  return (
    <span
      className={`pa-listings-badge pa-listings-badge--verified${isVerified ? ' is-verified' : ' is-unverified'}`}
    >
      <span className="pa-listings-badge__dot" aria-hidden />
      {isVerified ? t('adminVerified') : t('adminNotVerified')}
    </span>
  );
}

function TableOwnerCell({ name, email }) {
  return (
    <div className="pa-listings-owner">
      <span className="pa-listings-owner__name">{name || '—'}</span>
      {email ? <span className="pa-listings-owner__email">{email}</span> : null}
    </div>
  );
}

function renderCell(row, column, t) {
  if (column.key === 'name') {
    return <span className="pa-listings-table__listing-name">{row.name || '—'}</span>;
  }

  if (column.key === 'verified') {
    return <TableVerifiedBadge verified={row.verified} t={t} />;
  }

  if (column.key === 'owner') {
    return (
      <TableOwnerCell
        name={row.ownerName ?? row.owner}
        email={row.ownerEmail}
      />
    );
  }

  if (NUMERIC_KEYS.has(column.key)) {
    return Number(row[column.key] ?? 0).toLocaleString();
  }

  if (BADGE_TYPE_KEYS.has(column.key)) {
    return <TableTypeBadge value={row[column.key]} />;
  }

  if (column.format) {
    return column.format(row[column.key]);
  }

  const value = row[column.key];
  if (typeof value === 'boolean') return value ? t('adminVerified') : t('adminNotVerified');
  if (value == null || value === '') return '—';
  return value;
}

function cellClassName(column) {
  if (NUMERIC_KEYS.has(column.key)) return 'pa-listings-table__numeric';
  if (column.key === 'name') return 'pa-listings-table__listing';
  if (column.key === 'owner') return 'pa-listings-table__owner-col';
  return '';
}

function exportRowsToCsv(rows, columns) {
  const headers = ['Sl. no', ...columns.map((column) => column.label)];
  const lines = rows.map((row, index) => {
    const cells = [
      String(index + 1),
      ...columns.map((column) => {
        if (column.key === 'verified') {
          return row.verified ? 'Verified' : 'Not verified';
        }
        if (column.key === 'owner') {
          return row.ownerEmail ? `${row.ownerName} <${row.ownerEmail}>` : row.ownerName ?? row.owner ?? '';
        }
        const value = row[column.key];
        if (value == null) return '';
        return String(value).replace(/"/g, '""');
      }),
    ];
    return cells.map((cell) => `"${cell}"`).join(',');
  });
  const csv = [headers.map((header) => `"${header}"`).join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'listings.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function PlatformAnalyticsListingsTable({
  rows,
  columns,
  category,
  tablePage,
  pageSize,
  onPageChange,
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');

  const typeFilterKey = useMemo(() => getTypeFilterKey(columns), [columns]);
  const typeColumn = columns.find((column) => column.key === typeFilterKey);

  const typeOptions = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      const value = row[typeFilterKey];
      if (value != null && value !== '' && value !== '—') {
        values.add(String(value));
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows, typeFilterKey]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (query) {
        const haystack = [
          row.name,
          row.ownerName,
          row.ownerEmail,
          row.owner,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (typeFilter !== 'all') {
        if (String(row[typeFilterKey] ?? '') !== typeFilter) return false;
      }

      if (verifiedFilter === 'verified' && !row.verified) return false;
      if (verifiedFilter === 'unverified' && row.verified) return false;

      return true;
    });
  }, [rows, searchQuery, typeFilter, verifiedFilter, typeFilterKey]);

  useEffect(() => {
    onPageChange(1);
  }, [searchQuery, typeFilter, verifiedFilter, onPageChange]);

  const totalTablePages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(tablePage, totalTablePages);
  const paginatedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const tableStart = filteredRows.length ? (safePage - 1) * pageSize + 1 : 0;
  const tableEnd = Math.min(safePage * pageSize, filteredRows.length);

  const searchPlaceholder = t('platformAnalyticsSearchPlaceholder', {
    category: category ?? 'listings',
    defaultValue: 'Search listings…',
  });

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setVerifiedFilter('all');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'all' ||
    verifiedFilter !== 'all';

  return (
    <section className="pa-listings-panel">
      <div className="pa-listings-panel__head">
        <div className="pa-listings-panel__title-block">
          <h2>{t('platformAnalyticsListingsTitle')}</h2>
          <p>{t('platformAnalyticsListingsSubtitle', { defaultValue: 'Manage and monitor all listings in one place.' })}</p>
        </div>
        <div className="pa-listings-panel__head-actions">
          <span className="pa-listings-panel__count">
            {t('platformAnalyticsListingsCount', { count: filteredRows.length })}
          </span>
          <button
            type="button"
            className="pa-listings-toolbar__export"
            onClick={() => exportRowsToCsv(filteredRows, columns)}
            disabled={filteredRows.length === 0}
          >
            <Download size={14} strokeWidth={2} aria-hidden />
            {t('platformAnalyticsExport', { defaultValue: 'Export' })}
          </button>
        </div>
      </div>

      <div className="pa-listings-toolbar">
        <label className="pa-listings-toolbar__search">
          <Search size={15} strokeWidth={2} className="pa-listings-toolbar__search-icon" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </label>

        <div className="pa-listings-toolbar__controls">
          <label className="pa-listings-toolbar__select-wrap">
            <span className="pa-listings-toolbar__select-label">
              {typeColumn?.label ?? t('platformAnalyticsColType')}
            </span>
            <span className="pa-listings-toolbar__select-field">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                aria-label={t('platformAnalyticsFilterType', { defaultValue: 'Filter by type' })}
              >
                <option value="all">{t('platformAnalyticsAllTypes', { defaultValue: 'All types' })}</option>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatBadgeLabel(option)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} strokeWidth={2} className="pa-listings-toolbar__select-chevron" aria-hidden />
            </span>
          </label>

          <label className="pa-listings-toolbar__select-wrap">
            <span className="pa-listings-toolbar__select-label">
              {t('platformAnalyticsColVerified')}
            </span>
            <span className="pa-listings-toolbar__select-field">
              <select
                value={verifiedFilter}
                onChange={(event) => setVerifiedFilter(event.target.value)}
                aria-label={t('platformAnalyticsFilterVerified', { defaultValue: 'Filter by verified status' })}
              >
                <option value="all">{t('platformAnalyticsAllStatus', { defaultValue: 'All status' })}</option>
                <option value="verified">{t('adminVerified')}</option>
                <option value="unverified">{t('adminNotVerified')}</option>
              </select>
              <ChevronDown size={14} strokeWidth={2} className="pa-listings-toolbar__select-chevron" aria-hidden />
            </span>
          </label>

          <button
            type="button"
            className={`pa-listings-toolbar__filters${hasActiveFilters ? ' is-active' : ''}`}
            onClick={clearFilters}
            aria-label={t('platformAnalyticsClearFilters', { defaultValue: 'Clear filters' })}
          >
            <Filter size={14} strokeWidth={2} aria-hidden />
            {t('platformAnalyticsFilters', { defaultValue: 'Filters' })}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="pa-listings-panel__empty">{t('platformAnalyticsNoListings')}</p>
      ) : filteredRows.length === 0 ? (
        <p className="pa-listings-panel__empty">{t('platformAnalyticsNoFilteredListings', { defaultValue: 'No listings match your filters.' })}</p>
      ) : (
        <>
          <div className="pa-listings-table-wrap">
            <table className="pa-listings-table">
              <thead>
                <tr>
                  <th className="pa-listings-table__serial">
                    <span className="pa-listings-table__th-inner">
                      {t('platformAnalyticsColSerial')}
                      <ChevronsUpDown size={12} strokeWidth={2} className="pa-listings-table__sort-icon" aria-hidden />
                    </span>
                  </th>
                  {columns.map((column) => (
                    <th key={column.key} className={cellClassName(column)}>
                      <span className="pa-listings-table__th-inner">
                        {column.label}
                        <ChevronsUpDown size={12} strokeWidth={2} className="pa-listings-table__sort-icon" aria-hidden />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    <td className="pa-listings-table__serial">
                      {(safePage - 1) * pageSize + rowIndex + 1}
                    </td>
                    {columns.map((column) => (
                      <td key={`${row.id}-${column.key}`} className={cellClassName(column)}>
                        {renderCell(row, column, t)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pa-listings-table-footer">
            <p>
              {t('platformAnalyticsTableRange', {
                start: tableStart,
                end: tableEnd,
                total: filteredRows.length,
              })}
            </p>
            <div className="pa-listings-pagination">
              <button
                type="button"
                className="pa-listings-pagination__btn"
                onClick={() => onPageChange(Math.max(1, safePage - 1))}
                disabled={safePage <= 1}
                aria-label={t('platformAnalyticsPreviousPage')}
              >
                <ChevronLeft size={15} strokeWidth={2} aria-hidden />
              </button>
              {Array.from({ length: totalTablePages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pa-listings-pagination__page${page === safePage ? ' is-active' : ''}`}
                  onClick={() => onPageChange(page)}
                  aria-current={page === safePage ? 'page' : undefined}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="pa-listings-pagination__btn"
                onClick={() => onPageChange(Math.min(totalTablePages, safePage + 1))}
                disabled={safePage >= totalTablePages}
                aria-label={t('platformAnalyticsNextPage')}
              >
                <ChevronRight size={15} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
